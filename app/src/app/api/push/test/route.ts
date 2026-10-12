import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase-server'
import { sendPushToUser } from '@/lib/push'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }
const lastTest = new Map<string, number>()

// POST /api/push/test  { title?, body? } -> sends a test notification to every device of the caller
export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE })

  // Light per-instance throttle so the button can't be used to spam
  const now = Date.now()
  if (now - (lastTest.get(user.id) || 0) < 5000) {
    return NextResponse.json({ error: 'Too many requests', code: 'rate_limited' }, { status: 429, headers: NO_STORE })
  }
  lastTest.set(user.id, now)

  const input = await request.json().catch(() => null)
  const title = typeof input?.title === 'string' && input.title.trim() ? input.title.trim().slice(0, 80) : 'TrackWork'
  const body = typeof input?.body === 'string' ? input.body.trim().slice(0, 200) : ''

  const result = await sendPushToUser(user.id, { title, body, url: '/dashboard/settings', tag: 'trackwork-test' })
  return NextResponse.json(result, { status: result.sent > 0 ? 200 : 502, headers: NO_STORE })
}
