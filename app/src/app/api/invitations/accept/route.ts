import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase-server'
import { createNotifications, type NotificationInput } from '@/lib/notify'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const NO_STORE = { 'Cache-Control': 'no-store' }

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

async function getUser() {
  return getAuthUser()
}

function validToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value)
}

type InvitationState = 'pending' | 'accepted' | 'expired' | 'revoked'

function stateOf(invitation: { status?: string | null; expires_at?: string | null }): InvitationState {
  const status = invitation.status || 'pending'
  if (status === 'accepted') return 'accepted'
  if (status !== 'pending') return 'revoked'
  if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) return 'expired'
  return 'pending'
}

async function loadInvitation(token: string) {
  const { data: invitation, error } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()
  if (error) throw error
  return invitation
}

/**
 * Tells the inviter (and the other workspace admins) that someone joined. Never throws.
 * Notification text is stored in English: the server does not know each recipient's UI language.
 */
async function notifyJoined(
  invitation: { invited_by?: string | null; email?: string | null },
  workspaceId: string,
  workspaceName: string,
  joiner: { id: string; email?: string | null }
) {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', joiner.id)
      .maybeSingle()
    const who = profile?.username || joiner.email || invitation.email || 'Someone'
    const place = workspaceName || 'your workspace'

    const { data: admins } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'admin')
      .limit(100)

    const inviterId = invitation.invited_by || null
    const entries: NotificationInput[] = []
    const notified = new Set<string>([joiner.id])
    const link = '/dashboard/team'

    if (inviterId && !notified.has(inviterId)) {
      notified.add(inviterId)
      entries.push({
        user_id: inviterId,
        workspace_id: workspaceId,
        type: 'invitation_accepted',
        title: 'Invitation accepted',
        message: `${who} accepted your invitation and joined ${place}.`,
        link,
      })
    }
    for (const admin of admins || []) {
      const id = (admin as { user_id: string }).user_id
      if (!id || notified.has(id)) continue
      notified.add(id)
      entries.push({
        user_id: id,
        workspace_id: workspaceId,
        type: 'member_joined',
        title: 'New team member',
        message: `${who} joined ${place}.`,
        link,
      })
    }
    await createNotifications(entries)
  } catch (error) {
    console.error('Error sending join notifications:', error)
  }
}

/**
 * Public-safe preview of an invitation. Returns only the workspace name, role, inviter
 * username, state and expiry - never the token, invitee email or any other invitation.
 * `emailMatches` is only set when the visitor is signed in and the invite is email-bound.
 */
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token')
    if (!validToken(token)) return json({ error: 'Invalid invitation' }, 404)

    const invitation = await loadInvitation(token)
    if (!invitation) return json({ error: 'Invitation not found' }, 404)

    const [{ data: workspace }, inviter, user] = await Promise.all([
      supabaseAdmin.from('workspaces').select('name').eq('id', invitation.workspace_id).maybeSingle(),
      invitation.invited_by
        ? supabaseAdmin.from('profiles').select('username').eq('id', invitation.invited_by).maybeSingle()
        : Promise.resolve({ data: null }),
      getUser(),
    ])

    let emailMatches: boolean | undefined
    if (user && invitation.email) {
      emailMatches = (user.email || '').toLowerCase() === String(invitation.email).toLowerCase()
    }

    return json({
      workspaceName: workspace?.name ?? null,
      role: invitation.role === 'admin' ? 'admin' : 'member',
      inviterName: (inviter as { data: { username?: string | null } | null }).data?.username ?? null,
      expiresAt: invitation.expires_at ?? null,
      state: stateOf(invitation),
      signedIn: Boolean(user),
      ...(emailMatches === undefined ? {} : { emailMatches }),
    })
  } catch (error) {
    console.error('Error previewing invitation:', error)
    return json({ error: 'Failed to load invitation' }, 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const body = await request.json().catch(() => ({}))
    const token = body?.token
    if (!validToken(token)) return json({ error: 'Invalid invitation' }, 400)

    const invitation = await loadInvitation(token)
    if (!invitation) return json({ error: 'Invitation not found' }, 404)

    const state = stateOf(invitation)
    if (state === 'expired') return json({ error: 'This invitation has expired', code: 'expired' }, 410)
    if (state === 'revoked') return json({ error: 'This invitation is no longer valid', code: 'revoked' }, 410)

    if (invitation.email && (user.email || '').toLowerCase() !== String(invitation.email).toLowerCase()) {
      return json({ error: 'This invitation was sent to a different email address', code: 'email_mismatch' }, 403)
    }

    const workspaceId: string = invitation.workspace_id
    const role = invitation.role === 'admin' ? 'admin' : 'member'

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (existingError) throw existingError

    // Accepted links are single-use: only the person who already joined may re-open one
    if (state === 'accepted' && !existing) {
      return json({ error: 'This invitation has already been used', code: 'used' }, 410)
    }

    // Idempotent: an existing membership (e.g. a second click or a re-used link) is kept as is
    if (!existing) {
      const { error: insertError } = await supabaseAdmin
        .from('workspace_members')
        .insert({ workspace_id: workspaceId, user_id: user.id, role })
      // 23505 = concurrent accept already inserted the row
      if (insertError && insertError.code !== '23505') throw insertError
    }

    if (state === 'pending') {
      const { error: updateError } = await supabaseAdmin
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)
      if (updateError) console.error('Failed to mark invitation accepted:', updateError)
    }

    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('id, name')
      .eq('id', workspaceId)
      .maybeSingle()

    // Only the first accept of a pending invitation announces a new member (re-opened links stay silent)
    if (state === 'pending' && !existing) {
      await notifyJoined(invitation, workspaceId, workspace?.name ?? '', user)
    }

    // Invitees created through the e-mail invite have no username yet: the client sends them to onboarding
    const { data: ownProfile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()

    return json({
      success: true,
      workspaceId,
      workspaceName: workspace?.name ?? null,
      alreadyMember: Boolean(existing),
      needsProfile: !ownProfile?.username,
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return json({ error: 'Failed to accept invitation' }, 500)
  }
}
