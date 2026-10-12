import { describe, expect, it } from 'vitest'
import { localDateString } from './date'

describe('localDateString', () => {
  it('formats the local calendar day with zero padding', () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(localDateString(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('uses the local day, not the UTC day, near midnight', () => {
    expect(localDateString(new Date(2026, 2, 9, 0, 30))).toBe('2026-03-09')
    expect(localDateString(new Date(2026, 2, 9, 23, 59))).toBe('2026-03-09')
  })

  it('defaults to today', () => {
    expect(localDateString()).toBe(localDateString(new Date()))
    expect(localDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
