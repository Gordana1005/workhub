import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

/** Server-only service-role client (bypasses RLS). Created lazily; null when env is missing. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  cached = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  return cached
}

/**
 * True when a PostgREST / Postgres error means a table or column is not there (yet),
 * e.g. because a migration has not been applied. Callers use it to degrade gracefully.
 */
export function isMissingSchemaError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const code = error.code || ''
  if (code === '42P01' || code === '42703' || code === 'PGRST205' || code === 'PGRST204') return true
  const message = (error.message || '').toLowerCase()
  return message.includes('does not exist') || message.includes('could not find the') || message.includes('schema cache')
}
