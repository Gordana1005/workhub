import { describe, expect, it } from 'vitest'
import {
  balanceChanges,
  isMissingRpcError,
  isTransactionType,
  parsePositiveAmount,
  transactionDelta,
} from './finance-balance'

describe('transactionDelta', () => {
  it('income adds, expense subtracts, transfer is neutral', () => {
    expect(transactionDelta('income', 50)).toBe(50)
    expect(transactionDelta('expense', 50)).toBe(-50)
    expect(transactionDelta('transfer', 50)).toBe(0)
  })

  it('accepts numeric strings and rejects garbage safely', () => {
    expect(transactionDelta('income', '12.5')).toBe(12.5)
    expect(transactionDelta('income', 'abc')).toBe(0)
    expect(transactionDelta('income', undefined)).toBe(0)
    expect(transactionDelta('income', Infinity)).toBe(0)
    expect(transactionDelta('bogus', 10)).toBe(0)
  })
})

describe('parsePositiveAmount', () => {
  it('accepts positive finite numbers', () => {
    expect(parsePositiveAmount(5)).toBe(5)
    expect(parsePositiveAmount('7.25')).toBe(7.25)
  })

  it('rejects zero, negatives, NaN, empties', () => {
    for (const bad of [0, -1, '0', 'x', NaN, Infinity, null, undefined, '']) {
      expect(parsePositiveAmount(bad)).toBeNull()
    }
  })
})

describe('isTransactionType', () => {
  it('only allows the three types', () => {
    expect(isTransactionType('income')).toBe(true)
    expect(isTransactionType('expense')).toBe(true)
    expect(isTransactionType('transfer')).toBe(true)
    expect(isTransactionType('refund')).toBe(false)
    expect(isTransactionType(undefined)).toBe(false)
  })
})

describe('isMissingRpcError', () => {
  it('detects missing-function errors', () => {
    expect(isMissingRpcError({ code: '42883' })).toBe(true)
    expect(isMissingRpcError({ code: 'PGRST202' })).toBe(true)
    expect(isMissingRpcError({ message: 'Could not find the function public.x' })).toBe(true)
  })

  it('ignores other errors', () => {
    expect(isMissingRpcError(null)).toBe(false)
    expect(isMissingRpcError({ code: '23505', message: 'duplicate key' })).toBe(false)
  })
})

describe('balanceChanges', () => {
  it('create applies the new effect', () => {
    expect(balanceChanges(null, { account_id: 'a', type: 'income', amount: 100 })).toEqual({ a: 100 })
    expect(balanceChanges(null, { account_id: 'a', type: 'expense', amount: 30 })).toEqual({ a: -30 })
  })

  it('delete reverses the old effect', () => {
    expect(balanceChanges({ account_id: 'a', type: 'income', amount: 100 }, null)).toEqual({ a: -100 })
    expect(balanceChanges({ account_id: 'a', type: 'expense', amount: 30 }, null)).toEqual({ a: 30 })
  })

  it('amount edit applies only the difference', () => {
    const before = { account_id: 'a', type: 'expense', amount: 30 }
    const after = { account_id: 'a', type: 'expense', amount: 50 }
    expect(balanceChanges(before, after)).toEqual({ a: -20 })
  })

  it('type edit flips the sign', () => {
    const before = { account_id: 'a', type: 'expense', amount: 40 }
    const after = { account_id: 'a', type: 'income', amount: 40 }
    expect(balanceChanges(before, after)).toEqual({ a: 80 })
  })

  it('account change moves the effect between accounts', () => {
    const before = { account_id: 'a', type: 'income', amount: 25 }
    const after = { account_id: 'b', type: 'income', amount: 25 }
    expect(balanceChanges(before, after)).toEqual({ a: -25, b: 25 })
  })

  it('omits no-op changes and transfers', () => {
    const same = { account_id: 'a', type: 'income', amount: 10 }
    expect(balanceChanges(same, { ...same })).toEqual({})
    expect(balanceChanges(null, { account_id: 'a', type: 'transfer', amount: 10 })).toEqual({})
  })
})
