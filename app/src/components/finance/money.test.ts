import { describe, expect, it } from 'vitest'
import { FINANCE_CATEGORY_KEYS, formatMoney, toNumber } from './money'

describe('toNumber', () => {
  it('parses numbers and numeric strings', () => {
    expect(toNumber(5)).toBe(5)
    expect(toNumber('12.5')).toBe(12.5)
    expect(toNumber('-3')).toBe(-3)
  })

  it('returns 0 for anything non-finite', () => {
    for (const bad of [undefined, null, '', 'abc', NaN, Infinity]) {
      expect(toNumber(bad)).toBe(0)
    }
  })
})

describe('formatMoney', () => {
  it('formats in the active locale', () => {
    expect(formatMoney(1234.5, 'USD', 'en')).toBe('$1,234.50')
    expect(formatMoney(1234.5, 'USD', 'en', true)).toBe('$1,235')
  })

  it('never throws on invalid values or currencies', () => {
    expect(formatMoney(NaN, 'USD', 'en')).toBe('$0.00')
    expect(() => formatMoney(10, 'NOT_A_CURRENCY', 'en')).not.toThrow()
    expect(formatMoney(10, '', 'en')).toBe('$10.00')
  })

  it('uses a different formatting for mk', () => {
    expect(formatMoney(1000, 'EUR', 'mk')).not.toBe(formatMoney(1000, 'EUR', 'en'))
  })
})

describe('FINANCE_CATEGORY_KEYS', () => {
  it('has a translation key for every seeded category parser name', () => {
    for (const name of ['Food & Dining', 'Transportation', 'Salary', 'Freelance', 'Other Income']) {
      expect(FINANCE_CATEGORY_KEYS[name]).toMatch(/^finance\.cat/)
    }
  })
})
