import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseNaturalLanguageTransaction } from './finance-parser'

describe('parseNaturalLanguageTransaction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0)) // 15 June 2026, local
  })
  afterEach(() => vi.useRealTimers())

  it('returns null for empty / amount-less input', () => {
    expect(parseNaturalLanguageTransaction('')).toBeNull()
    expect(parseNaturalLanguageTransaction('   ')).toBeNull()
    expect(parseNaturalLanguageTransaction('bought some groceries')).toBeNull()
  })

  it('parses an expense with amount, category and relative date', () => {
    const result = parseNaturalLanguageTransaction('Spent $50 on groceries yesterday')
    expect(result).not.toBeNull()
    expect(result!.amount).toBe(50)
    expect(result!.type).toBe('expense')
    expect(result!.category).toBe('Food & Dining')
    expect(result!.date.getDate()).toBe(14)
    expect(result!.date.getMonth()).toBe(5)
  })

  it('parses income keywords', () => {
    const result = parseNaturalLanguageTransaction('Earned $500 from freelance work')
    expect(result!.type).toBe('income')
    expect(result!.amount).toBe(500)
    expect(result!.category).toBe('Freelance')
  })

  it('handles thousands separators and decimals', () => {
    expect(parseNaturalLanguageTransaction('rent $1,200')!.amount).toBe(1200)
    expect(parseNaturalLanguageTransaction('coffee 4.50')!.amount).toBe(4.5)
    expect(parseNaturalLanguageTransaction('$1,000.99 salary')!.amount).toBeCloseTo(1000.99)
  })

  it('rejects a zero amount', () => {
    expect(parseNaturalLanguageTransaction('spent $0 on nothing')).toBeNull()
  })

  it('defaults to an expense dated today', () => {
    const result = parseNaturalLanguageTransaction('$15 coffee at Starbucks')
    expect(result!.type).toBe('expense')
    expect(result!.date.getDate()).toBe(15)
    expect(result!.category).toBe('Food & Dining')
  })

  it('understands "N days ago" and "last week"', () => {
    expect(parseNaturalLanguageTransaction('$10 lunch 3 days ago')!.date.getDate()).toBe(12)
    expect(parseNaturalLanguageTransaction('$10 lunch last week')!.date.getDate()).toBe(8)
  })

  it('understands "tomorrow"', () => {
    expect(parseNaturalLanguageTransaction('$10 movie tomorrow')!.date.getDate()).toBe(16)
  })

  it('falls back to a generic description when nothing is left', () => {
    expect(parseNaturalLanguageTransaction('$20')!.description).toBe('Expense')
  })

  it('capitalises the description', () => {
    const { description } = parseNaturalLanguageTransaction('$12 pizza')!
    expect(description.charAt(0)).toBe(description.charAt(0).toUpperCase())
    expect(description.toLowerCase()).toContain('pizza')
  })
})
