import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Small helpers for API routes that use the service-role (RLS-bypassing) client.
 * Every route must prove the caller belongs to the workspace that owns the row
 * it touches - these keep that check to one line.
 */

/** Returns the caller's role in the workspace, or null if not a member (or on error). */
export async function getWorkspaceRole(
  admin: SupabaseClient,
  workspaceId: string | null | undefined,
  userId: string
): Promise<'admin' | 'member' | null> {
  if (!workspaceId) return null
  const { data } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle()
  return data ? ((data as { role: string }).role as 'admin' | 'member') : null
}

/**
 * Looks up the workspace that owns a row of `table` (the table must have a
 * `workspace_id` column). Returns null when the row does not exist.
 */
export async function getRowWorkspaceId(
  admin: SupabaseClient,
  table: string,
  id: string
): Promise<string | null> {
  const { data } = await admin.from(table).select('workspace_id').eq('id', id).maybeSingle()
  return data ? ((data as { workspace_id: string }).workspace_id ?? null) : null
}

/** Remove keys a client must never be able to set through a generic update body. */
export function omitKeys<T extends Record<string, any>>(obj: T, keys: string[]): Partial<T> {
  const copy: Record<string, any> = { ...obj }
  for (const k of keys) delete copy[k]
  return copy as Partial<T>
}
