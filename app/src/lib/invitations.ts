/**
 * Pure helpers for the email invitation flow (no I/O, safe to import from server and client code).
 */

/** Max invitations a workspace may create / re-send per rolling window. */
export const INVITE_RATE_LIMIT = 20
export const INVITE_RATE_WINDOW_MS = 60 * 60 * 1000
/** Minimum gap between two e-mails for the same invitation. */
export const INVITE_RESEND_COOLDOWN_MS = 60 * 1000
export const INVITE_TTL_DAYS = 7
export const INVITE_MESSAGE_MAX = 500

// Same shape the database CHECK constraint (008_security_constraints.sql) accepts.
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

/** Trims + lower-cases an address. Returns null when it is not a usable e-mail. */
export function normalizeInviteEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (!email || email.length > 254) return null
  if (email.includes('..') || email.startsWith('.')) return null
  const [local] = email.split('@')
  if (!local || local.length > 64 || local.endsWith('.')) return null
  return EMAIL_PATTERN.test(email) ? email : null
}

/** Optional personal note: strips control characters, collapses blank runs, caps the length. */
export function sanitizeInviteMessage(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return (
    raw
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, INVITE_MESSAGE_MAX)
  )
}

/**
 * Text that goes into the Auth e-mail template variables ({{ .Data.* }}). Whether the template engine
 * escapes them depends on the Supabase version, so angle brackets are removed up front: an inviter must
 * not be able to inject markup into an e-mail sent from our domain.
 */
export function emailSafeText(raw: unknown, max = 200): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[<>]/g, '').slice(0, max)
}

/** True once `count` invitations were already sent inside the current window. */
export function isInviteRateLimited(count: number, limit: number = INVITE_RATE_LIMIT): boolean {
  return Number.isFinite(count) && count >= limit
}

/** ISO timestamp of the start of the rolling rate-limit window. */
export function inviteWindowStart(now: number = Date.now(), windowMs: number = INVITE_RATE_WINDOW_MS): string {
  return new Date(now - windowMs).toISOString()
}

/** Seconds left before an invitation may be e-mailed again (0 = allowed now). */
export function resendWaitSeconds(
  lastSentAt: string | null | undefined,
  now: number = Date.now(),
  cooldownMs: number = INVITE_RESEND_COOLDOWN_MS
): number {
  if (!lastSentAt) return 0
  const sent = new Date(lastSentAt).getTime()
  if (!Number.isFinite(sent)) return 0
  return Math.max(0, Math.ceil((sent + cooldownMs - now) / 1000))
}

export function inviteExpiry(now: number = Date.now(), days: number = INVITE_TTL_DAYS): string {
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString()
}

export type InvitationState = 'pending' | 'accepted' | 'expired' | 'revoked'

export function invitationState(
  invitation: { status?: string | null; expires_at?: string | null },
  now: number = Date.now()
): InvitationState {
  const status = invitation.status || 'pending'
  if (status === 'accepted') return 'accepted'
  if (status !== 'pending') return 'revoked'
  if (invitation.expires_at && new Date(invitation.expires_at).getTime() < now) return 'expired'
  return 'pending'
}

export function buildJoinLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/join?token=${encodeURIComponent(token)}`
}

/** Supabase Auth answers 422 / "already been registered" when the address belongs to a confirmed user. */
export function isAlreadyRegisteredError(error: { status?: number; code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const code = (error.code || '').toLowerCase()
  if (code === 'email_exists' || code === 'user_already_exists') return true
  const message = (error.message || '').toLowerCase()
  if (message.includes('already been registered') || message.includes('already registered') || message.includes('already exists')) {
    return true
  }
  return error.status === 422 && !message.includes('rate')
}

/** Supabase Auth throttles e-mail sending (built-in mailer: a handful per hour). */
export function isEmailRateLimitError(error: { status?: number; code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const code = (error.code || '').toLowerCase()
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return true
  const message = (error.message || '').toLowerCase()
  return error.status === 429 || message.includes('rate limit')
}

export type InviteEmailError = 'rate_limited' | 'send_failed'

/**
 * Maps an auth error to what the client may learn. An existing account and any other failure
 * look the same on purpose: this endpoint must not tell a workspace admin whether an address
 * is registered.
 */
export function classifyInviteEmailError(
  error: { status?: number; code?: string; message?: string } | null | undefined
): InviteEmailError {
  return isEmailRateLimitError(error) ? 'rate_limited' : 'send_failed'
}
