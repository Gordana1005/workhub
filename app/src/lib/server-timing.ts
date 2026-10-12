/**
 * Tiny helper for the `Server-Timing` response header, so slow spots (auth vs. database) show up
 * in the browser's Network tab without any tooling. Overhead is one `performance.now()` per mark.
 */

/** Formats `{ auth: 12.3, db: 45 }` as `auth;dur=12.3, db;dur=45`. Invalid / negative values are skipped. */
export function formatServerTiming(metrics: Record<string, number>): string {
  const parts: string[] = []
  for (const [rawName, value] of Object.entries(metrics)) {
    if (!Number.isFinite(value) || value < 0) continue
    // Metric names are HTTP tokens: keep letters, digits, '-' and '_' only.
    const name = rawName.replace(/[^A-Za-z0-9_-]/g, '_')
    if (!name) continue
    parts.push(`${name};dur=${Math.round(value * 10) / 10}`)
  }
  return parts.join(', ')
}

export class ServerTimer {
  private readonly started = now()
  private readonly marks: Record<string, number> = {}

  /** Runs (or awaits) `work` and adds its duration to the metric `name` (repeated names add up). */
  async time<T>(name: string, work: PromiseLike<T> | (() => PromiseLike<T> | T)): Promise<T> {
    const begin = now()
    try {
      return await (typeof work === 'function' ? work() : work)
    } finally {
      this.add(name, now() - begin)
    }
  }

  add(name: string, ms: number): void {
    this.marks[name] = (this.marks[name] || 0) + ms
  }

  /** Header value, always ending with the total time since the timer was created. */
  header(): string {
    return formatServerTiming({ ...this.marks, total: now() - this.started })
  }

  /** Sets the `Server-Timing` header on a response and returns it. */
  apply<T extends Response>(response: T): T {
    try {
      response.headers.set('Server-Timing', this.header())
    } catch {
      // immutable headers (e.g. a redirect response): timing is best-effort only
    }
    return response
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}
