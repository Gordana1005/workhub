import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/supabase-server'
import { isMissingSchemaError } from '@/lib/supabase-admin'
import {
  classifyInviteEmailError,
  emailSafeText,
  inviteWindowStart,
  type InviteEmailError,
} from '@/lib/invitations'

/** Server-only helpers shared by the invitation routes. */

export async function getSessionUser() {
  return getAuthUser()
}

export function appOrigin(request: Request): string {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, '')
}

/** Columns added by migration 025; code keeps working (without them) until it is applied. */
const OPTIONAL_COLUMNS = ['message', 'last_sent_at']

/**
 * Inserts (or, with `existingId`, updates) an invitation row, dropping columns that the database
 * does not have yet: first the 025 columns, then `invited_by` (migration 017).
 */
export async function writeInvitation(
  admin: SupabaseClient,
  row: Record<string, unknown>,
  existingId?: string
) {
  const variants: string[][] = [[], OPTIONAL_COLUMNS, [...OPTIONAL_COLUMNS, 'invited_by']]
  let result: { data: any; error: any } = { data: null, error: null }
  for (const omit of variants) {
    const payload = Object.fromEntries(Object.entries(row).filter(([key]) => !omit.includes(key)))
    const query = existingId
      ? admin.from('invitations').update(payload).eq('id', existingId)
      : admin.from('invitations').insert(payload)
    result = await query.select().single()
    if (!result.error || !isMissingSchemaError(result.error)) break
  }
  return result
}

/** Invitations created or e-mailed for the workspace inside the rolling rate-limit window. */
export async function countRecentInvites(admin: SupabaseClient, workspaceId: string): Promise<number> {
  const since = inviteWindowStart()
  const withResends = await admin
    .from('invitations')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .or(`created_at.gte.${since},last_sent_at.gte.${since}`)
  if (!withResends.error) return withResends.count || 0
  if (!isMissingSchemaError(withResends.error)) throw withResends.error

  const { count, error } = await admin
    .from('invitations')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .gte('created_at', since)
  if (error) throw error
  return count || 0
}

export interface InviteEmailResult {
  emailSent: boolean
  emailError?: InviteEmailError
}

/**
 * Sends the Supabase Auth invite e-mail. For addresses that already belong to a confirmed user the
 * API refuses (422); that is reported exactly like any other delivery failure so this endpoint is
 * not an account-enumeration oracle. We deliberately do NOT call generateLink for such users: its
 * magic link would sign the holder in as the invitee, so it must never be handed to the inviter.
 */
export async function sendInviteEmail(
  admin: SupabaseClient,
  params: {
    email: string
    redirectTo: string
    workspaceName: string
    inviterName: string
    message: string
    role: string
  }
): Promise<InviteEmailResult> {
  try {
    const { error } = await admin.auth.admin.inviteUserByEmail(params.email, {
      redirectTo: params.redirectTo,
      data: {
        invited_to_workspace: emailSafeText(params.workspaceName),
        invited_by_name: emailSafeText(params.inviterName),
        invite_message: emailSafeText(params.message, 500),
        invite_role: params.role,
        needs_password: true,
      },
    })
    if (error) {
      console.warn('[invitations] invite e-mail not sent:', error.status, error.code || error.message)
      return { emailSent: false, emailError: classifyInviteEmailError(error) }
    }
    return { emailSent: true }
  } catch (error) {
    console.error('[invitations] invite e-mail failed:', error)
    return { emailSent: false, emailError: 'send_failed' }
  }
}
