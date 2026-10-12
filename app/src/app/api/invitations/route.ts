import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createSupabaseServer, getAuthUser } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-guard'
import { getWorkspaceRole } from '@/lib/api-access'
import {
  appOrigin,
  countRecentInvites,
  getSessionUser,
  sendInviteEmail,
  writeInvitation,
} from '@/lib/invitations-server'
import {
  buildJoinLink,
  invitationState,
  inviteExpiry,
  isInviteRateLimited,
  normalizeInviteEmail,
  sanitizeInviteMessage,
} from '@/lib/invitations'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function fail(status: number, code: string, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, code, ...extra }, { status })
}

/**
 * Creates an invitation and e-mails it (admin only).
 * Body: { workspace_id, email, role?, message? }
 * Returns { invitation, link, emailSent, emailError? }. When emailSent is false the inviter shares `link` manually.
 * Errors carry a `code` the UI translates: invalid_email, already_member, already_invited, rate_limited.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { user, workspaceId } = auth
    const body = await request.json().catch(() => ({}))
    const email = normalizeInviteEmail(body?.email)
    if (!email) return fail(400, 'invalid_email', 'A valid email is required')

    const role = body?.role === 'admin' ? 'admin' : 'member'
    const message = sanitizeInviteMessage(body?.message)

    // Never invite yourself or someone who is already in the workspace
    if ((user.email || '').toLowerCase() === email) {
      return fail(409, 'already_member', 'This person is already a member of the workspace')
    }
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id').eq('email', email).limit(5)
    const profileIds = (profiles || []).map((p: { id: string }) => p.id)
    if (profileIds.length) {
      const { data: members } = await supabaseAdmin
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .in('user_id', profileIds)
        .limit(1)
      if (members?.length) return fail(409, 'already_member', 'This person is already a member of the workspace')
    }

    // A live pending invitation blocks a new one; any other leftover row (accepted, revoked, expired) is reused
    // because (workspace_id, email) is unique.
    const { data: existingRows } = await supabaseAdmin
      .from('invitations')
      .select('id, status, expires_at')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .limit(20)
    const livePending = (existingRows || []).find((row) => invitationState(row) === 'pending')
    if (livePending) {
      return fail(409, 'already_invited', 'An invitation was already sent to this email', { invitationId: livePending.id })
    }
    const reusable = (existingRows || [])[0]

    if (isInviteRateLimited(await countRecentInvites(supabaseAdmin, workspaceId))) {
      return fail(429, 'rate_limited', 'Too many invitations. Try again in an hour.')
    }

    const now = new Date().toISOString()
    const { data: invitation, error } = await writeInvitation(
      supabaseAdmin,
      {
        workspace_id: workspaceId,
        email,
        token: crypto.randomUUID(),
        role,
        status: 'pending',
        invited_by: user.id,
        message: message || null,
        expires_at: inviteExpiry(),
        ...(reusable ? { created_at: now } : {}),
      },
      reusable?.id
    )

    if (error || !invitation) {
      console.error('Database Error:', error)
      return NextResponse.json({ error: error?.message || 'Database error' }, { status: 500 })
    }

    const link = buildJoinLink(appOrigin(request), invitation.token)

    const [{ data: workspace }, { data: inviter }] = await Promise.all([
      supabaseAdmin.from('workspaces').select('name').eq('id', workspaceId).maybeSingle(),
      supabaseAdmin.from('profiles').select('username').eq('id', user.id).maybeSingle(),
    ])

    const result = await sendInviteEmail(supabaseAdmin, {
      email,
      redirectTo: link,
      workspaceName: workspace?.name || '',
      inviterName: inviter?.username || user.email || '',
      message,
      role,
    })

    if (result.emailSent) {
      // last_sent_at comes from migration 025; ignore failures when it is not applied yet
      const { error: stampError } = await supabaseAdmin
        .from('invitations')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('id', invitation.id)
      if (!stampError) invitation.last_sent_at = new Date().toISOString()
    }

    return NextResponse.json({
      invitation,
      link,
      joinLink: link, // backwards compatible alias
      emailSent: result.emailSent,
      ...(result.emailError ? { emailError: result.emailError } : {}),
    })
  } catch (error) {
    console.error('Error in invitation route:', error)
    return fail(500, 'server_error', 'Failed to send invitation')
  }
}

/** Revokes a pending invitation (admin of its workspace only). DELETE /api/invitations?id=... */
export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = new URL(request.url).searchParams.get('id')
    if (!id || id.length > 64) return fail(400, 'invalid_request', 'Invitation id is required')

    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .select('id, workspace_id, status, expires_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error

    // Same answer for "does not exist" and "not yours" so ids cannot be probed
    const role = invitation ? await getWorkspaceRole(supabaseAdmin, invitation.workspace_id, user.id) : null
    if (!invitation || role !== 'admin') return fail(404, 'not_found', 'Invitation not found')

    if (invitationState(invitation) === 'accepted') {
      return fail(409, 'already_accepted', 'This invitation was already accepted')
    }

    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', invitation.id)
    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking invitation:', error)
    return fail(500, 'server_error', 'Failed to revoke invitation')
  }
}

export async function GET(request: Request) {
  const supabase = createSupabaseServer()

  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspace_id = searchParams.get('workspace_id')

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  try {
    // Verify workspace access
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Tokens are bearer credentials: only admins may list invitations.
    // Members just get counts.
    if (membership.role !== 'admin') {
      const { count } = await supabaseAdmin
        .from('invitations')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace_id)
        .eq('status', 'pending')
      return NextResponse.json({ invitations: [], counts: { pending: count || 0 } })
    }

    const { data: invitations, error } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error

    return NextResponse.json({ invitations: invitations || [] })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}