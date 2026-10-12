/** Pure helpers for finance account balances. */

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export function isTransactionType(value: unknown): value is TransactionType {
  return typeof value === 'string' && (TRANSACTION_TYPES as readonly string[]).includes(value)
}

/**
 * Signed effect of a transaction on its account balance:
 * income +amount, expense -amount. A transfer has a single account_id and no
 * destination, so it has no balance effect (this mirrors the DB trigger).
 * Never returns NaN: invalid amounts count as 0.
 */
export function transactionDelta(type: unknown, amount: unknown): number {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 0
  if (type === 'income') return n
  if (type === 'expense') return -n
  return 0
}

/** Parses a strictly positive, finite amount; returns null when invalid. */
export function parsePositiveAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** True for the Postgres / PostgREST errors meaning "this function does not exist". */
export function isMissingRpcError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return (
    error.code === '42883' ||
    error.code === 'PGRST202' ||
    /could not find the function|function .* does not exist/i.test(error.message || '')
  )
}

/**
 * Balance changes needed when a transaction is replaced by another one
 * (edit of amount / type / account). `before`/`after` null means created/deleted.
 * Returns a map accountId -> delta, with zero entries removed.
 */
export function balanceChanges(
  before: { account_id?: string | null; type?: unknown; amount?: unknown } | null,
  after: { account_id?: string | null; type?: unknown; amount?: unknown } | null
): Record<string, number> {
  const out: Record<string, number> = {}
  const add = (id: string | null | undefined, d: number) => {
    if (!id || !d) return
    out[id] = (out[id] || 0) + d
  }
  if (before) add(before.account_id, -transactionDelta(before.type, before.amount))
  if (after) add(after.account_id, transactionDelta(after.type, after.amount))
  for (const k of Object.keys(out)) if (!out[k]) delete out[k]
  return out
}
