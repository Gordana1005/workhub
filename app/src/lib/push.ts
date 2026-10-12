import webpush from 'web-push'
import { getSupabaseAdmin, isMissingSchemaError } from '@/lib/supabase-admin'

export interface PushPayload {
  title: string
  body?: string
  /** In-app path opened when the notification is clicked, e.g. /dashboard/tasks */
  url?: string
  /** Notifications with the same tag replace each other */
  tag?: string
}

let configured: boolean | null = null

/** True when the VAPID env vars are present (push is silently disabled otherwise). */
export function isPushConfigured(): boolean {
  if (configured !== null) return configured
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    configured = false
    return false
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    configured = true
  } catch (error) {
    console.error('[push] invalid VAPID configuration:', error)
    configured = false
  }
  return configured
}

function safeUrl(url: string | undefined): string {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : '/dashboard'
}

/**
 * Sends a web push to every subscription of a user. Never throws: missing env,
 * missing table, network errors etc. are swallowed. Expired subscriptions (404/410) are removed.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    if (!userId || !isPushConfigured()) return
    const admin = getSupabaseAdmin()
    if (!admin) return

    const { data: subs, error } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (error) {
      if (!isMissingSchemaError(error)) console.error('[push] failed to load subscriptions:', error.message)
      return
    }
    if (!subs || subs.length === 0) return

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body || '',
      url: safeUrl(payload.url),
      tag: payload.tag,
    })

    const expired: string[] = []
    const delivered: string[] = []

    await Promise.all(
      subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
            { TTL: 60 * 60 * 24, timeout: 8000 }
          )
          delivered.push(sub.endpoint)
        } catch (err: any) {
          const status = err?.statusCode
          if (status === 404 || status === 410) expired.push(sub.endpoint)
          else console.error('[push] send failed:', status || err?.message)
        }
      })
    )

    if (expired.length) {
      await admin.from('push_subscriptions').delete().in('endpoint', expired)
    }
    if (delivered.length) {
      await admin
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .in('endpoint', delivered)
    }
  } catch (error) {
    console.error('[push] unexpected error:', error)
  }
}
