import { describe, expect, it } from 'vitest'
import { ServerTimer, formatServerTiming } from './server-timing'

describe('formatServerTiming', () => {
  it('formats metrics as name;dur=ms pairs', () => {
    expect(formatServerTiming({ auth: 12.34, db: 45 })).toBe('auth;dur=12.3, db;dur=45')
  })

  it('skips negative / non-finite values and sanitises names', () => {
    expect(formatServerTiming({ ok: 1, bad: -1, nan: Number.NaN, 'my metric!': 2 })).toBe('ok;dur=1, my_metric_;dur=2')
  })
})

describe('ServerTimer', () => {
  it('accumulates repeated metrics and always reports a total', async () => {
    const timer = new ServerTimer()
    await timer.time('db', Promise.resolve(1))
    await timer.time('db', () => 2)
    timer.add('auth', 5)
    expect(timer.header()).toMatch(/^db;dur=[\d.]+, auth;dur=5, total;dur=[\d.]+$/)
  })

  it('records the metric even when the work throws, and rethrows', async () => {
    const timer = new ServerTimer()
    await expect(timer.time('db', Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(timer.header()).toContain('db;dur=')
  })

  it('sets the header on a response and returns it', () => {
    const response = new Response('{}')
    const out = new ServerTimer().apply(response)
    expect(out).toBe(response)
    expect(response.headers.get('Server-Timing')).toMatch(/^total;dur=[\d.]+$/)
  })
})
