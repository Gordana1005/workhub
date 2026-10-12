import { describe, expect, it } from 'vitest'
import {
  INVITE_MESSAGE_MAX,
  INVITE_RATE_LIMIT,
  buildJoinLink,
  classifyInviteEmailError,
  emailSafeText,
  invitationState,
  inviteWindowStart,
  isAlreadyRegisteredError,
  isInviteRateLimited,
  normalizeInviteEmail,
  resendWaitSeconds,
  sanitizeInviteMessage,
} from './invitations'

describe('normalizeInviteEmail', () => {
  it('trims and lower-cases valid addresses', () => {
    expect(normalizeInviteEmail('  Jane.Doe+Work@Example.COM ')).toBe('jane.doe+work@example.com')
  })

  it('rejects malformed, empty and non-string input', () => {
    for (const bad of ['', 'plain', 'a@b', 'a b@c.com', '@c.com', 'a@@c.com', 'a..b@c.com', '.a@c.com', 'a.@c.com', null, 42, undefined]) {
      expect(normalizeInviteEmail(bad)).toBeNull()
    }
  })

  it('rejects addresses over the length limits', () => {
    expect(normalizeInviteEmail(`${'a'.repeat(65)}@example.com`)).toBeNull()
    expect(normalizeInviteEmail(`a@${'b'.repeat(250)}.com`)).toBeNull()
  })
})

describe('sanitizeInviteMessage', () => {
  it('strips control characters, trims and caps the length', () => {
    expect(sanitizeInviteMessage('  Hi\u0000 there\n\n\n\nSee you  ')).toBe('Hi there\n\nSee you')
    expect(sanitizeInviteMessage('x'.repeat(INVITE_MESSAGE_MAX + 50))).toHaveLength(INVITE_MESSAGE_MAX)
    expect(sanitizeInviteMessage(undefined)).toBe('')
  })
})

describe('emailSafeText', () => {
  it('removes angle brackets and caps the length', () => {
    expect(emailSafeText('Acme <script>alert(1)</script>')).toBe('Acme scriptalert(1)/script')
    expect(emailSafeText('x'.repeat(300))).toHaveLength(200)
    expect(emailSafeText(null)).toBe('')
  })
})

describe('rate limiting', () => {
  it('limits once the workspace reached the hourly cap', () => {
    expect(isInviteRateLimited(0)).toBe(false)
    expect(isInviteRateLimited(INVITE_RATE_LIMIT - 1)).toBe(false)
    expect(isInviteRateLimited(INVITE_RATE_LIMIT)).toBe(true)
    expect(isInviteRateLimited(5, 5)).toBe(true)
  })

  it('computes the window start and the per-invitation resend cooldown', () => {
    const now = Date.parse('2026-01-01T12:00:00.000Z')
    expect(inviteWindowStart(now)).toBe('2026-01-01T11:00:00.000Z')
    expect(resendWaitSeconds(null, now)).toBe(0)
    expect(resendWaitSeconds('2026-01-01T11:59:30.000Z', now)).toBe(30)
    expect(resendWaitSeconds('2026-01-01T11:58:00.000Z', now)).toBe(0)
    expect(resendWaitSeconds('not a date', now)).toBe(0)
  })
})

describe('invitationState', () => {
  const now = Date.parse('2026-01-10T00:00:00.000Z')
  it('derives the state from status and expiry', () => {
    expect(invitationState({ status: 'pending', expires_at: '2026-01-11T00:00:00Z' }, now)).toBe('pending')
    expect(invitationState({ status: null, expires_at: null }, now)).toBe('pending')
    expect(invitationState({ status: 'pending', expires_at: '2026-01-09T00:00:00Z' }, now)).toBe('expired')
    expect(invitationState({ status: 'accepted' }, now)).toBe('accepted')
    expect(invitationState({ status: 'revoked' }, now)).toBe('revoked')
  })
})

describe('auth error helpers', () => {
  it('recognises an already registered address', () => {
    expect(isAlreadyRegisteredError({ status: 422, message: 'A user with this email address has already been registered' })).toBe(true)
    expect(isAlreadyRegisteredError({ code: 'email_exists' })).toBe(true)
    expect(isAlreadyRegisteredError({ status: 500, message: 'boom' })).toBe(false)
    expect(isAlreadyRegisteredError(null)).toBe(false)
  })

  it('classifies send failures without revealing account existence', () => {
    expect(classifyInviteEmailError({ status: 429, code: 'over_email_send_rate_limit' })).toBe('rate_limited')
    expect(classifyInviteEmailError({ status: 422, message: 'already been registered' })).toBe('send_failed')
    expect(classifyInviteEmailError({ status: 500, message: 'smtp down' })).toBe('send_failed')
  })
})

describe('buildJoinLink', () => {
  it('joins origin and token without double slashes', () => {
    expect(buildJoinLink('https://trackwork.me/', 'abc-123')).toBe('https://trackwork.me/join?token=abc-123')
  })
})
