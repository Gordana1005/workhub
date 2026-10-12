import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isMissingSchemaError } from '@/lib/supabase-admin'

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

// GET /api/push/prefs -> { available, prefs: { daily_digest: boolean, locale?: 'en' | 'mk' } }
export async function GET() {
  const user = await getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)
  const admin = getSupabaseAdmin()
  if (!admin) return json({ available: false, prefs: { daily_digest: true } })

  const { data, error } = await admin.from('profiles').select('notification_prefs').eq('id', user.id).maybeSingle()
  if (error) {
    if (!isMissingSchemaError(error)) console.error('[prefs] load failed:', error.message)
    return json({ available: false, prefs: { daily_digest: true } })
  }
  const stored = ((data as any)?.notification_prefs || {}) as Record<string, unknown>
  return json({
    available: true,
    prefs: { ...stored, daily_digest: stored.daily_digest !== false },
  })
}

// PUT /api/push/prefs  body: { daily_digest?: boolean, locale?: 'en' | 'mk' }  (merged into stored prefs)
export async function PUT(request: Request) {
  const user = await getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)
  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'Server not configured' }, 503)

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return json({ error: 'Invalid body' }, 400)

  const patch: Record<string, unknown> = {}
  if (typeof body.daily_digest === 'boolean') patch.daily_digest = body.daily_digest
  if (body.locale === 'en' || body.locale === 'mk') patch.locale = body.locale
  if (Object.keys(patch).length === 0) return json({ error: 'Nothing to update' }, 400)

  const { data: current, error: loadError } = await admin
    .from('profiles')
    .select('notification_prefs')
    .eq('id', user.id)
    .maybeSingle()
  if (loadError) {
    if (isMissingSchemaError(loadError)) return json({ error: 'Preferences are not available yet', code: 'not_available' }, 503)
    console.error('[prefs] load failed:', loadError.message)
    return json({ error: 'Failed to save preferences' }, 500)
  }

  const merged = { ...(((current as any)?.notification_prefs as Record<string, unknown>) || {}), ...patch }
  const { error } = await admin.from('profiles').update({ notification_prefs: merged }).eq('id', user.id)
  if (error) {
    console.error('[prefs] save failed:', error.message)
    return json({ error: 'Failed to save preferences' }, 500)
  }
  return json({ success: true, prefs: { ...merged, daily_digest: merged.daily_digest !== false } })
}
