import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getWorkspaceRole } from '@/lib/api-access'
import { appOrigin, countRecentInvites, getSessionUser, sendInviteEmail } from '@/lib/invitations-server'
import {
  buildJoinLink,
  invitationState,
  inviteExpiry,
  isInviteRateLimited,
  resendWaitSeconds,
} from '@/lib/invitations'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function fail(status: number, code: string, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, code, ...extra }, { status })
}

/**
 * Re-sends the invitation e-mail and extends the expiry by 7 days (admin of the workspace only).
 * Body: { id }. Returns { invitation, link, emailSent, emailError? } like POST /api/invitations.
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const id = typeof body?.id === 'string' && body.id.length <= 64 ? body.id : ''
    if (!id) return fail(400, 'invalid_request', 'Invitation id is required')

    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error

    // Same answer for "does not exist" and "not yours" so ids cannot be probed
    const role = invitation ? await getWorkspaceRole(supabaseAdmin, invitation.workspace_id, user.id) : null
    if (!invitation || role !== 'admin') return fail(404, 'not_found', 'Invitation not found')

    const state = invitationState(invitation)
    if (state === 'accepted') return fail(409, 'already_accepted', 'This invitation was already accepted')
    if (state === 'revoked') return fail(409, 'revoked', 'This invitation was revoked')

    const wait = resendWaitSeconds(invitation.last_sent_at)
    if (wait > 0) return fail(429, 'resend_cooldown', 'Please wait before sending again', { retryAfter: wait })

    if (isInviteRateLimited(await countRecentInvites(supabaseAdmin, invitation.workspace_id))) {
      return fail(429, 'rate_limited', 'Too many invitations. Try again in an hour.')
    }

    const [{ data: workspace }, { data: inviter }] = await Promise.all([
      supabaseAdmin.from('workspaces').select('name').eq('id', invitation.workspace_id).maybeSingle(),
      supabaseAdmin.from('profiles').select('username').eq('id', user.id).maybeSingle(),
    ])

    const link = buildJoinLink(appOrigin(request), invitation.token)
    const result = await sendInviteEmail(supabaseAdmin, {
      email: invitation.email,
      redirectTo: link,
      workspaceName: workspace?.name || '',
      inviterName: inviter?.username || user.email || '',
      message: typeof invitation.message === 'string' ? invitation.message : '',
      role: invitation.role === 'admin' ? 'admin' : 'member',
    })

    // Extend the expiry even when the e-mail bounced so the shared link keeps working.
    const patch: Record<string, unknown> = { expires_at: inviteExpiry(), status: 'pending' }
    if (result.emailSent) patch.last_sent_at = new Date().toISOString()
    let { data: updated, error: updateError } = await supabaseAdmin
      .from('invitations')
      .update(patch)
      .eq('id', invitation.id)
      .select()
      .single()
    if (updateError) {
      // last_sent_at comes from migration 025; retry without it when it is not applied yet
      delete patch.last_sent_at
      ;({ data: updated, error: updateError } = await supabaseAdmin
        .from('invitations')
        .update(patch)
        .eq('id', invitation.id)
        .select()
        .single())
    }
    if (updateError) throw updateError

    return NextResponse.json({
      invitation: updated,
      link,
      emailSent: result.emailSent,
      ...(result.emailError ? { emailError: result.emailError } : {}),
    })
  } catch (error) {
    console.error('Error resending invitation:', error)
    return fail(500, 'server_error', 'Failed to resend invitation')
  }
}
