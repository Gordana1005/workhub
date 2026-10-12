import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { sendPushToUser } from '@/lib/push'

export interface NotificationInput {
  user_id: string
  workspace_id: string
  type: string
  title: string
  message: string
  link?: string
  /** Set false for in-app only (no web push). Defaults to true. */
  push?: boolean
}

// Keep requests snappy even if a push service is slow
const PUSH_TIMEOUT_MS = 4000

function withTimeout(promise: Promise<unknown>, ms: number): Promise<unknown> {
  return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))])
}

async function pushFor(entry: NotificationInput): Promise<void> {
  await withTimeout(
    sendPushToUser(entry.user_id, {
      title: entry.title,
      body: entry.message,
      url: entry.link,
      tag: entry.type,
    }),
    PUSH_TIMEOUT_MS
  )
}

/**
 * Inserts in-app notification rows AND fires a web push to each recipient.
 * Never throws - a failing notification must not break the request that triggered it.
 */
export async function createNotifications(entries: NotificationInput[]): Promise<void> {
  try {
    const valid = entries.filter((e) => e && e.user_id && e.workspace_id)
    if (!valid.length) return

    const admin = getSupabaseAdmin()
    if (admin) {
      const rows = valid.map(({ push: _push, ...row }) => ({ ...row, read: false }))
      const { error } = await admin.from('notifications').insert(rows)
      if (error) console.error('[notify] insert failed:', error.message)
    }

    await Promise.all(valid.filter((e) => e.push !== false).map((e) => pushFor(e)))
  } catch (error) {
    console.error('[notify] unexpected error:', error)
  }
}

export async function createNotification(input: NotificationInput): Promise<void> {
  await createNotifications([input])
}
