import { invalidateApiCache } from './api-cache'

/**
 * Deletes every Cache Storage entry (the service worker's runtime caches, which
 * can hold authenticated pages). Does NOT unregister the service worker.
 * Safe to call anywhere: a no-op on the server or when Cache Storage is
 * unavailable, and it never throws.
 */
export async function clearClientCaches(): Promise<void> {
  invalidateApiCache() // in-memory GET cache (signed-out users must not see the last account's data)
  try {
    if (typeof window === 'undefined' || typeof caches === 'undefined') return
    const keys = await caches.keys()
    await Promise.all(
      keys.map(async (key) => {
        try {
          await caches.delete(key)
        } catch {
          // ignore a single failing cache
        }
      })
    )
  } catch {
    // Cache Storage can throw in private mode / blocked storage: nothing to do
  }
}
