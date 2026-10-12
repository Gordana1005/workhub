import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isMissingSchemaError } from '@/lib/supabase-admin'
import { isPushConfigured } from '@/lib/push'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  return error || !user ? null : user
}

function validEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

// GET /api/push/subscribe?endpoint=...  -> { configured, subscribed, publicKey }
export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const configured = isPushConfigured()
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null
  const endpoint = new URL(request.url).searchParams.get('endpoint')

  let subscribed = false
  let available = true
  const admin = getSupabaseAdmin()
  if (admin) {
    let query = admin.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    if (endpoint) query = query.eq('endpoint', endpoint)
    const { count, error } = await query
    if (error) {
      if (isMissingSchemaError(error)) available = false
      else console.error('[push] status failed:', error.message)
    } else {
      subscribed = (count || 0) > 0
    }
  } else {
    available = false
  }

  return json({ configured: configured && available, subscribed, publicKey: configured ? publicKey : null })
}

// POST /api/push/subscribe  body: PushSubscription JSON ({ endpoint, keys: { p256dh, auth } })
export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint
  const p256dh = body?.keys?.p256dh
  const auth = body?.keys?.auth
  if (!validEndpoint(endpoint) || typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth) {
    return json({ error: 'Invalid subscription' }, 400)
  }
  if (!isPushConfigured()) return json({ error: 'Push is not configured', code: 'not_configured' }, 503)

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'Server not configured' }, 503)

  const { error } = await admin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: (request.headers.get('user-agent') || '').slice(0, 300),
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )
  if (error) {
    if (isMissingSchemaError(error)) return json({ error: 'Push is not available yet', code: 'not_configured' }, 503)
    console.error('[push] subscribe failed:', error.message)
    return json({ error: 'Failed to save subscription' }, 500)
  }
  return json({ success: true }, 201)
}

// DELETE /api/push/subscribe  body: { endpoint }  (or ?endpoint=...)
export async function DELETE(request: Request) {
  const user = await getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint || new URL(request.url).searchParams.get('endpoint')
  if (!validEndpoint(endpoint)) return json({ error: 'endpoint is required' }, 400)

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'Server not configured' }, 503)

  const { error } = await admin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
  if (error && !isMissingSchemaError(error)) {
    console.error('[push] unsubscribe failed:', error.message)
    return json({ error: 'Failed to remove subscription' }, 500)
  }
  return json({ success: true })
}
