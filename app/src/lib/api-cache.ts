/**
 * A tiny shared GET cache for read-mostly API data (projects / members pickers, the home screen).
 *
 *  - identical requests made at the same time share ONE network call (a page and a dialog that both
 *    want the workspace members no longer fetch twice);
 *  - a result is reused for `ttlMs` (default 30s), so hopping between pages does not refetch;
 *  - any mutating request to /api/* clears the cache (see installApiCacheInvalidation), so a list never
 *    lags behind the user's own changes.
 *
 * Callers must treat the returned JSON as read-only.
 */

interface Entry {
  at: number
  promise: Promise<unknown>
}

const entries = new Map<string, Entry>()
const DEFAULT_TTL_MS = 30_000

export function getJsonCached<T = any>(url: string, options: { ttlMs?: number } = {}): Promise<T> {
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS
  const hit = entries.get(url)
  if (hit && Date.now() - hit.at < ttl) return hit.promise as Promise<T>

  const promise = fetch(url).then(async (response) => {
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error((data && data.error) || `Request failed (${response.status})`)
    return data as T
  })
  const entry: Entry = { at: Date.now(), promise }
  entries.set(url, entry)
  // failures are never cached
  promise.catch(() => {
    if (entries.get(url) === entry) entries.delete(url)
  })
  return promise
}

/** Drops cached responses whose URL contains `needle` (everything when omitted). */
export function invalidateApiCache(needle = ''): void {
  if (!needle) {
    entries.clear()
    return
  }
  Array.from(entries.keys()).forEach((key) => {
    if (key.includes(needle)) entries.delete(key)
  })
}

let installed = false

/**
 * Clears the cache whenever the app sends a non-GET request to its own /api. Installed once from the
 * root provider; it only observes requests and never changes them.
 */
export function installApiCacheInvalidation(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return
  installed = true
  const original = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const method = (init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase()
      if (method !== 'GET' && method !== 'HEAD') {
        const target = typeof input === 'string' ? input : input instanceof URL ? input.pathname : (input as Request).url
        if (target.startsWith('/api/') || target.includes(`${window.location.origin}/api/`)) {
          invalidateApiCache()
          const request = original(input, init)
          // the write has landed: anything read while it was in flight may be stale
          request.then(() => invalidateApiCache(), () => invalidateApiCache())
          return request
        }
      }
    } catch {
      // never let bookkeeping break a request
    }
    return original(input, init)
  }
}
