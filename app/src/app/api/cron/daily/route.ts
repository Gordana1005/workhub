import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin, isMissingSchemaError } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notify'
import { generateNextOccurrence } from '@/lib/recurrence'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TIME_ZONE = process.env.APP_TIMEZONE || 'Europe/Skopje'
const TASK_LIMIT = 5000
const RECURRING_LIMIT = 500

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization') || ''
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** YYYY-MM-DD of `date` in the app time zone. */
function dayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function dueKey(dueDate: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return dueDate
  const parsed = new Date(dueDate)
  return Number.isNaN(parsed.getTime()) ? null : dayKey(parsed)
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function digestText(locale: string | undefined, dueToday: number, overdue: number) {
  if (locale === 'mk') {
    const parts: string[] = []
    if (dueToday) parts.push(`${dueToday} ${dueToday === 1 ? 'задача со рок денес' : 'задачи со рок денес'}`)
    if (overdue) parts.push(`${overdue} ${overdue === 1 ? 'задача со поминат рок' : 'задачи со поминат рок'}`)
    return { title: 'Дневен преглед', message: `Имате ${parts.join(' и ')}.` }
  }
  return {
    title: 'Daily digest',
    message: `You have ${dueToday} task${dueToday === 1 ? '' : 's'} due today, ${overdue} overdue.`,
  }
}

async function sendDigests(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const today = dayKey(new Date())
  // Anything due up to the end of "tomorrow UTC" is a candidate; exact day is decided in the app time zone
  const horizon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()

  const { data: tasks, error } = await admin
    .from('tasks')
    .select('assignee_id, workspace_id, due_date')
    .eq('is_completed', false)
    .not('assignee_id', 'is', null)
    .not('due_date', 'is', null)
    .lte('due_date', horizon)
    .limit(TASK_LIMIT)
  if (error) throw new Error(`digest task query failed: ${error.message}`)

  type Counts = { dueToday: number; overdue: number }
  const perUser = new Map<string, Map<string, Counts>>()
  for (const t of tasks || []) {
    const key = dueKey(String(t.due_date))
    if (!key || key > today) continue
    const byWorkspace = perUser.get(t.assignee_id) || new Map<string, Counts>()
    const counts = byWorkspace.get(t.workspace_id) || { dueToday: 0, overdue: 0 }
    if (key === today) counts.dueToday++
    else counts.overdue++
    byWorkspace.set(t.workspace_id, counts)
    perUser.set(t.assignee_id, byWorkspace)
  }

  const userIds = Array.from(perUser.keys())
  if (userIds.length === 0) return { users: 0, sent: 0 }

  // Only count workspaces the user still belongs to
  const memberships = new Set<string>()
  for (const ids of chunk(userIds, 100)) {
    const { data } = await admin.from('workspace_members').select('user_id, workspace_id').in('user_id', ids)
    for (const m of data || []) memberships.add(`${m.user_id}:${m.workspace_id}`)
  }

  // Opt-outs / locale (column may not exist yet -> everybody gets the default)
  const prefs = new Map<string, { daily_digest?: boolean; locale?: string }>()
  for (const ids of chunk(userIds, 100)) {
    const { data, error: prefsError } = await admin.from('profiles').select('id, notification_prefs').in('id', ids)
    if (prefsError) {
      if (!isMissingSchemaError(prefsError)) console.error('[cron] prefs load failed:', prefsError.message)
      break
    }
    for (const p of data || []) prefs.set(p.id, (p as any).notification_prefs || {})
  }

  // One digest per user per day, even if the cron is triggered twice
  const alreadySent = new Set<string>()
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
  for (const ids of chunk(userIds, 100)) {
    const { data } = await admin
      .from('notifications')
      .select('user_id')
      .eq('type', 'daily_digest')
      .gte('created_at', since)
      .in('user_id', ids)
    for (const n of data || []) alreadySent.add(n.user_id)
  }

  let sent = 0
  for (const userId of userIds) {
    const userPrefs = prefs.get(userId) || {}
    if (userPrefs.daily_digest === false || alreadySent.has(userId)) continue

    // Only workspaces the user still belongs to; the notification is filed under the busiest one
    let dueToday = 0
    let overdue = 0
    let workspaceId: string | null = null
    let best = 0
    for (const [wsId, counts] of perUser.get(userId)!) {
      if (!memberships.has(`${userId}:${wsId}`)) continue
      dueToday += counts.dueToday
      overdue += counts.overdue
      if (counts.dueToday + counts.overdue > best) {
        best = counts.dueToday + counts.overdue
        workspaceId = wsId
      }
    }
    if (!workspaceId) continue
    if (dueToday + overdue === 0) continue

    const text = digestText(userPrefs.locale, dueToday, overdue)
    await createNotification({
      user_id: userId,
      workspace_id: workspaceId,
      type: 'daily_digest',
      title: text.title,
      message: text.message,
      link: '/dashboard/tasks',
    })
    sent++
  }
  return { users: userIds.length, sent }
}

async function generateRecurring(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data: tasks, error } = await admin
    .from('tasks')
    .select('*')
    .not('recurrence_pattern', 'is', null)
    .or('is_completed.eq.true,status.eq.Done')
    .limit(RECURRING_LIMIT)
  if (error) {
    if (isMissingSchemaError(error)) return { found: 0, created: 0, ended: 0, errors: 0, skipped: true }
    throw new Error(`recurring task query failed: ${error.message}`)
  }

  const counts = { found: (tasks || []).length, created: 0, ended: 0, errors: 0 }
  for (const task of tasks || []) {
    const result = await generateNextOccurrence(admin, task)
    if (result === 'created') counts.created++
    else if (result === 'ended') counts.ended++
    else if (result === 'error') counts.errors++
  }
  return counts
}

// GET /api/cron/daily - Vercel Cron (Authorization: Bearer $CRON_SECRET)
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const result: Record<string, unknown> = {}

  // Recurring tasks first so freshly generated occurrences can appear in today's digest
  try {
    result.recurring = await generateRecurring(admin)
  } catch (error: any) {
    console.error('[cron] recurring failed:', error)
    result.recurring = { error: error?.message || 'failed' }
  }

  try {
    result.digest = await sendDigests(admin)
  } catch (error: any) {
    console.error('[cron] digest failed:', error)
    result.digest = { error: error?.message || 'failed' }
  }

  return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } })
}
