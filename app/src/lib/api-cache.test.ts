import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJsonCached, invalidateApiCache } from './api-cache'

function mockFetch(impl?: (url: string) => { ok: boolean; status?: number; body: unknown }) {
  const fn = vi.fn(async (url: string) => {
    const { ok, status = ok ? 200 : 500, body } = impl ? impl(url) : { ok: true, body: { url } }
    return { ok, status, json: async () => body } as unknown as Response
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  invalidateApiCache()
  vi.unstubAllGlobals()
})

describe('getJsonCached', () => {
  it('shares one request between concurrent callers and reuses the result', async () => {
    const fetchMock = mockFetch()
    const [a, b] = await Promise.all([getJsonCached('/api/x?1'), getJsonCached('/api/x?1')])
    const c = await getJsonCached('/api/x?1')
    expect(a).toBe(b)
    expect(c).toBe(a)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refetches after invalidation (all or by fragment)', async () => {
    const fetchMock = mockFetch()
    await getJsonCached('/api/projects?w=1')
    await getJsonCached('/api/team?w=1')
    invalidateApiCache('/api/projects')
    await getJsonCached('/api/projects?w=1')
    await getJsonCached('/api/team?w=1')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    invalidateApiCache()
    await getJsonCached('/api/team?w=1')
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('does not cache failures and surfaces the server error message', async () => {
    const fetchMock = mockFetch(() => ({ ok: false, status: 403, body: { error: 'Access denied' } }))
    await expect(getJsonCached('/api/y')).rejects.toThrow('Access denied')
    await expect(getJsonCached('/api/y')).rejects.toThrow('Access denied')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('honours a short ttl', async () => {
    const fetchMock = mockFetch()
    await getJsonCached('/api/z', { ttlMs: 0 })
    await getJsonCached('/api/z', { ttlMs: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
