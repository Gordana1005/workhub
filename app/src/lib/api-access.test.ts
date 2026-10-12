import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getRowWorkspaceId, getWorkspaceRole, omitKeys, withMembership } from './api-access'

/**
 * Tiny fake of the chainable Supabase query builder:
 * from(table).select().eq().eq().maybeSingle() resolves with the first row of
 * `tables[table]` whose columns match every .eq() filter.
 */
function fakeClient(tables: Record<string, Array<Record<string, any>>>): SupabaseClient {
  return {
    from(table: string) {
      const filters: Array<[string, unknown]> = []
      const builder: any = {
        select: () => builder,
        eq: (col: string, value: unknown) => {
          filters.push([col, value])
          return builder
        },
        maybeSingle: async () => {
          const row = (tables[table] || []).find((r) => filters.every(([c, v]) => r[c] === v))
          return { data: row ?? null, error: null }
        },
      }
      return builder
    },
  } as unknown as SupabaseClient
}

describe('getWorkspaceRole', () => {
  const admin = fakeClient({
    workspace_members: [
      { workspace_id: 'w1', user_id: 'u1', role: 'admin' },
      { workspace_id: 'w1', user_id: 'u2', role: 'member' },
    ],
  })

  it('returns the role for members', async () => {
    expect(await getWorkspaceRole(admin, 'w1', 'u1')).toBe('admin')
    expect(await getWorkspaceRole(admin, 'w1', 'u2')).toBe('member')
  })

  it('returns null for non-members and other workspaces', async () => {
    expect(await getWorkspaceRole(admin, 'w1', 'stranger')).toBeNull()
    expect(await getWorkspaceRole(admin, 'w2', 'u1')).toBeNull()
  })

  it('returns null without a workspace id', async () => {
    expect(await getWorkspaceRole(admin, null, 'u1')).toBeNull()
    expect(await getWorkspaceRole(admin, undefined, 'u1')).toBeNull()
    expect(await getWorkspaceRole(admin, '', 'u1')).toBeNull()
  })
})

describe('getRowWorkspaceId', () => {
  const admin = fakeClient({
    tasks: [
      { id: 't1', workspace_id: 'w1' },
      { id: 't2', workspace_id: null },
    ],
  })

  it('returns the owning workspace of a row', async () => {
    expect(await getRowWorkspaceId(admin, 'tasks', 't1')).toBe('w1')
  })

  it('returns null for missing rows or rows without a workspace', async () => {
    expect(await getRowWorkspaceId(admin, 'tasks', 'nope')).toBeNull()
    expect(await getRowWorkspaceId(admin, 'tasks', 't2')).toBeNull()
    expect(await getRowWorkspaceId(admin, 'unknown_table', 't1')).toBeNull()
  })
})

describe('omitKeys', () => {
  it('removes the listed keys without mutating the input', () => {
    const input = { id: '1', workspace_id: 'w', title: 'x' }
    const out = omitKeys(input, ['workspace_id', 'created_by'])
    expect(out).toEqual({ id: '1', title: 'x' })
    expect(input.workspace_id).toBe('w')
  })

  it('is a no-op for an empty key list', () => {
    expect(omitKeys({ a: 1 }, [])).toEqual({ a: 1 })
  })
})

describe('withMembership', () => {
  const admin = fakeClient({ workspace_members: [{ workspace_id: 'w1', user_id: 'u1', role: 'member' }] })

  it('hands back the work result together with the role for members', async () => {
    const work = vi.fn(async () => ({ rows: 3 }))
    expect(await withMembership(admin, 'w1', 'u1', work)).toEqual({ ok: true, value: { rows: 3 }, role: 'member' })
    expect(work).toHaveBeenCalledTimes(1)
  })

  it('discards the work result for non-members', async () => {
    const work = vi.fn(async () => ({ secret: true }))
    expect(await withMembership(admin, 'w1', 'stranger', work)).toEqual({ ok: false })
    expect(await withMembership(admin, null, 'u1', work)).toEqual({ ok: false })
  })

  it('propagates errors from the work', async () => {
    await expect(withMembership(admin, 'w1', 'u1', () => Promise.reject(new Error('db down')))).rejects.toThrow('db down')
  })
})
