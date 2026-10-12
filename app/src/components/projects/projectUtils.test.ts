import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  daysUntil,
  parseDay,
  progressOf,
  readableOn,
  statusDotClass,
  statusGroup,
  statusKey,
  statusRank,
} from './projectUtils'

describe('status helpers', () => {
  it('normalises the different spellings', () => {
    expect(statusKey('in_progress')).toBe('inProgress')
    expect(statusKey('in-progress')).toBe('inProgress')
    expect(statusKey('on_hold')).toBe('onHold')
    expect(statusKey('on-hold')).toBe('onHold')
    expect(statusKey('active')).toBe('active')
    expect(statusKey('mystery')).toBeNull()
  })

  it('groups in-progress with active and keeps unknown values', () => {
    expect(statusGroup('in_progress')).toBe('active')
    expect(statusGroup('on-hold')).toBe('onHold')
    expect(statusGroup('mystery')).toBe('mystery')
  })

  it('ranks live work before finished work', () => {
    const order = ['active', 'planning', 'on_hold', 'completed', 'archived'].map(statusRank)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(new Set(order).size).toBe(5)
    expect(statusRank('in_progress')).toBe(statusRank('active'))
  })

  it('maps statuses to dot classes', () => {
    expect(statusDotClass('active')).toBe('bg-success')
    expect(statusDotClass('on_hold')).toBe('bg-warning')
    expect(statusDotClass('whatever')).toBe('bg-text-muted')
  })
})

describe('progressOf', () => {
  it('computes a rounded, clamped percentage', () => {
    expect(progressOf(1, 3)).toBe(33)
    expect(progressOf(2, 3)).toBe(67)
    expect(progressOf(5, 4)).toBe(100)
    expect(progressOf(0, 0)).toBe(0)
  })
})

describe('day parsing', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 22, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('parses date-only and timestamp values as a local calendar day', () => {
    const a = parseDay('2026-03-04')!
    const b = parseDay('2026-03-04T23:59:00Z')!
    expect([a.getFullYear(), a.getMonth(), a.getDate()]).toEqual([2026, 2, 4])
    expect(b.getDate()).toBe(4)
    expect(parseDay(null)).toBeNull()
    expect(parseDay('nonsense')).toBeNull()
  })

  it('counts whole days from today', () => {
    expect(daysUntil('2026-06-15')).toBe(0)
    expect(daysUntil('2026-06-20')).toBe(5)
    expect(daysUntil('2026-06-10')).toBe(-5)
    expect(daysUntil(undefined)).toBeNull()
  })
})

describe('readableOn', () => {
  it('picks dark text on light backgrounds and white on dark ones', () => {
    expect(readableOn('#ffffff')).toBe('#16181D')
    expect(readableOn('#000000')).toBe('#ffffff')
    expect(readableOn('#1d4ed8')).toBe('#ffffff')
  })

  it('falls back to white for invalid colours', () => {
    expect(readableOn(null)).toBe('#ffffff')
    expect(readableOn('#fff')).toBe('#ffffff')
    expect(readableOn('#zzzzzz')).toBe('#ffffff')
  })
})
