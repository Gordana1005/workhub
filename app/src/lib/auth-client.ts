import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * Browser-side identity helpers.
 *
 * `supabase.auth.getUser()` is a NETWORK request to Supabase Auth on every call, and the shell, the
 * pages and several components each made their own. `getSession()` reads the stored session locally
 * (and refreshes it if it expired), so the signed-in user is known without a round trip. Use these
 * for display / "who am I" in the UI; the server still verifies the token on every API call, so
 * nothing is trusted from here.
 */

let userPromise: Promise<User | null> | null = null
let profilePromise: Promise<{ username: string | null; avatar_url: string | null } | null> | null = null

/** The signed-in user from the locally stored session (one shared promise, no network). */
export function getSessionUser(): Promise<User | null> {
  if (!userPromise) {
    userPromise = supabase.auth
      .getSession()
      .then(({ data }) => data.session?.user ?? null)
      .catch(() => null)
  }
  return userPromise
}

/** Convenience: just the id ('' when signed out). */
export async function getSessionUserId(): Promise<string> {
  return (await getSessionUser())?.id ?? ''
}

/** The caller's profile row (username + avatar), fetched once and shared. Null when unavailable. */
export function getMyProfile(): Promise<{ username: string | null; avatar_url: string | null } | null> {
  if (!profilePromise) {
    profilePromise = getSessionUser()
      .then(async (user) => {
        if (!user) return null
        const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
        return data ?? null
      })
      .catch(() => null)
    // do not keep a failed / empty lookup around
    profilePromise.then((profile) => {
      if (!profile) profilePromise = null
    })
  }
  return profilePromise
}

/** Forget the cached identity (after sign-in / sign-out, or after the profile was edited). */
export function resetAuthCache(): void {
  userPromise = null
  profilePromise = null
}

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    // token refreshes keep the same user: only a real identity change needs a reset
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') resetAuthCache()
  })
}
