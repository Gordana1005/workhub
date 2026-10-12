import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getUserFromClient, type AuthClientLike, type AuthUser } from './auth-claims'

export type { AuthUser } from './auth-claims'

/**
 * Cookie-bound Supabase client for Route Handlers / Server Components (RLS as the caller).
 * Refreshed session cookies are written back when the runtime allows it (Route Handlers do).
 */
export function createSupabaseServer(): SupabaseClient {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Components cannot set cookies; the middleware refreshes the session there.
          }
        },
      },
    }
  )
}

/**
 * The signed-in user as `{ id, email }`, or null. Verifies the JWT locally via `getClaims()` (no
 * Supabase Auth round trip) and falls back to `getUser()`. Pass the client you already created to
 * avoid building a second one.
 */
export async function getAuthUser(client?: SupabaseClient | AuthClientLike): Promise<AuthUser | null> {
  return getUserFromClient((client ?? createSupabaseServer()) as AuthClientLike)
}
