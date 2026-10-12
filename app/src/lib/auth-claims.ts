/**
 * Cheap authentication: verify the access token locally instead of asking Supabase Auth.
 *
 * `auth.getUser()` is a network round trip to Supabase Auth on EVERY call. `auth.getClaims()` verifies
 * the JWT signature + expiry locally (JWKS is fetched once and cached) for projects that use asymmetric
 * signing keys, refreshes the session when it is expired, and transparently falls back to a server
 * call for legacy HS256 projects - so it is never slower than `getUser()`.
 *
 * Pure module (no next/headers) so it can run in the edge middleware and in unit tests.
 */

export interface AuthUser {
  id: string
  email: string
}

type ClaimsLike = Record<string, unknown> | null | undefined

/** Maps verified JWT claims to the minimal user the app needs. Null for anonymous / malformed claims. */
export function claimsToUser(claims: ClaimsLike): AuthUser | null {
  if (!claims || typeof claims !== 'object') return null
  const sub = claims.sub
  if (typeof sub !== 'string' || !sub) return null
  // The anon key itself is a JWT with role "anon": never treat it as a signed-in user.
  if (claims.role === 'anon') return null
  return { id: sub, email: typeof claims.email === 'string' ? claims.email : '' }
}

/** Structural subset of the Supabase auth client (so tests can pass a fake). */
export interface AuthClientLike {
  auth: {
    getClaims?: (...args: any[]) => Promise<{ data: { claims?: ClaimsLike } | null; error: unknown }>
    getUser: (...args: any[]) => Promise<{ data: { user: { id: string; email?: string | null } | null }; error: unknown }>
  }
}

/**
 * Returns the signed-in user or null. Prefers `getClaims()` (no network when keys are asymmetric);
 * falls back to `getUser()` when claims are unavailable. Never throws.
 */
export async function getUserFromClient(client: AuthClientLike): Promise<AuthUser | null> {
  const auth = client.auth
  if (typeof auth.getClaims === 'function') {
    try {
      const { data, error } = await auth.getClaims()
      const user = claimsToUser(data?.claims)
      if (user) return user
      // No session at all: nothing to verify, and getUser() would only say the same.
      if (error && (error as { name?: string }).name === 'AuthSessionMissingError') return null
    } catch {
      // fall through to the server check
    }
  }
  try {
    const { data, error } = await auth.getUser()
    if (error || !data?.user) return null
    return { id: data.user.id, email: data.user.email || '' }
  } catch {
    return null
  }
}
