import type { SupabaseClient } from '@supabase/supabase-js'

/** Shape saved by components/tasks/RecurrenceSelector.tsx (stored as JSON in tasks.recurrence_pattern). */
export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  interval: number
  endDate?: string | null
  weekDays?: number[]
  monthDay?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export function parseRecurrence(value: unknown): RecurrencePattern | null {
  if (!value) return null
  let raw: any = value
  try {
    if (typeof raw === 'string') raw = JSON.parse(raw)
    // A JSON string stored in a jsonb column can be double-encoded
    if (typeof raw === 'string') raw = JSON.parse(raw)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object') return null
  // Tolerate the legacy edge-function shape ({ frequency, interval, daysOfWeek, dayOfMonth })
  const type = raw.type || raw.frequency
  if (!['daily', 'weekly', 'monthly', 'yearly', 'custom'].includes(type)) return null
  const interval = Math.max(1, Math.min(365, Math.floor(Number(raw.interval)) || 1))
  const weekDays = Array.isArray(raw.weekDays || raw.daysOfWeek)
    ? (raw.weekDays || raw.daysOfWeek).map(Number).filter((d: number) => d >= 0 && d <= 6)
    : undefined
  const monthDay = Number(raw.monthDay || raw.dayOfMonth) || undefined
  return { type, interval, endDate: raw.endDate || null, weekDays, monthDay }
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addUtcDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

function withTimeOf(source: Date, day: Date): Date {
  return new Date(
    Date.UTC(
      day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(),
      source.getUTCHours(), source.getUTCMinutes(), source.getUTCSeconds(), source.getUTCMilliseconds()
    )
  )
}

function weekIndex(d: Date): number {
  // Weeks start on Sunday (matches the selector's 0 = Sunday)
  const sunday = addUtcDays(startOfUtcDay(d), -d.getUTCDay())
  return Math.floor(sunday.getTime() / (7 * DAY_MS))
}

/** The occurrence strictly after `from`, according to the pattern. */
function stepForward(pattern: RecurrencePattern, from: Date, anchor: Date): Date {
  const { interval } = pattern
  switch (pattern.type) {
    case 'weekly': {
      if (pattern.weekDays && pattern.weekDays.length > 0) {
        for (let i = 1; i <= 7 * interval + 7; i++) {
          const candidate = addUtcDays(from, i)
          if (!pattern.weekDays.includes(candidate.getUTCDay())) continue
          if ((weekIndex(candidate) - weekIndex(anchor)) % interval !== 0) continue
          return candidate
        }
      }
      return addUtcDays(from, 7 * interval)
    }
    case 'monthly': {
      const monthIndex = from.getUTCFullYear() * 12 + from.getUTCMonth() + interval
      const year = Math.floor(monthIndex / 12)
      const month = monthIndex % 12
      const wanted = pattern.monthDay || from.getUTCDate()
      const day = Math.min(wanted, daysInMonth(year, month))
      return withTimeOf(from, new Date(Date.UTC(year, month, day)))
    }
    case 'yearly': {
      const year = from.getUTCFullYear() + interval
      const month = from.getUTCMonth()
      const day = Math.min(from.getUTCDate(), daysInMonth(year, month))
      return withTimeOf(from, new Date(Date.UTC(year, month, day)))
    }
    case 'daily':
    case 'custom':
    default:
      return addUtcDays(from, interval)
  }
}

/**
 * Next due date for a recurring task. Starts from the task's due date (or `now` if none) and
 * keeps stepping until the result is not in the past, so a late completion does not spawn
 * an already-overdue copy. Returns null when the series has ended (endDate passed).
 */
export function computeNextDueDate(pattern: RecurrencePattern, dueDate: string | null | undefined, now = new Date()): Date | null {
  const base = dueDate ? new Date(dueDate) : now
  if (Number.isNaN(base.getTime())) return null
  const today = startOfUtcDay(now)

  let next = stepForward(pattern, base, base)
  for (let guard = 0; guard < 2000 && startOfUtcDay(next) < today; guard++) {
    next = stepForward(pattern, next, base)
  }

  if (pattern.endDate) {
    const end = new Date(pattern.endDate)
    if (!Number.isNaN(end.getTime()) && startOfUtcDay(next) > startOfUtcDay(end)) return null
  }
  return next
}

export type RecurrenceResult = 'created' | 'ended' | 'skipped' | 'error'

/**
 * Idempotently creates the next occurrence of a completed recurring task.
 * The recurrence "baton" is handed over: the new task receives recurrence_pattern and the
 * completed one has it cleared (atomic conditional update), so running this twice - from the
 * task PATCH and from the cron - can never produce a duplicate.
 * Never throws.
 */
export async function generateNextOccurrence(admin: SupabaseClient, task: Record<string, any>, now = new Date()): Promise<RecurrenceResult> {
  try {
    const original = task.recurrence_pattern
    const pattern = parseRecurrence(original)
    if (!pattern || !task.id || !task.workspace_id) return 'skipped'

    const next = computeNextDueDate(pattern, task.due_date, now)

    // Claim the series: only one caller can flip recurrence_pattern from set to null
    const { data: claimed, error: claimError } = await admin
      .from('tasks')
      .update({ recurrence_pattern: null })
      .eq('id', task.id)
      .not('recurrence_pattern', 'is', null)
      .select('id')
    if (claimError) {
      console.error('[recurrence] claim failed:', claimError.message)
      return 'error'
    }
    if (!claimed || claimed.length === 0) return 'skipped' // someone else already handled it
    if (!next) return 'ended'

    const dateOnly = typeof task.due_date === 'string' && task.due_date.length === 10
    const insert: Record<string, any> = {
      workspace_id: task.workspace_id,
      project_id: task.project_id ?? null,
      title: task.title,
      description: task.description ?? null,
      priority: task.priority || 'medium',
      due_date: dateOnly ? next.toISOString().slice(0, 10) : next.toISOString(),
      assignee_id: task.assignee_id ?? null,
      creator_id: task.creator_id ?? null,
      status: 'To Do',
      is_completed: false,
      recurrence_pattern: original,
    }
    for (const key of ['category', 'estimated_hours', 'tags']) {
      if (task[key] !== undefined && task[key] !== null) insert[key] = task[key]
    }

    const { error: insertError } = await admin.from('tasks').insert(insert)
    if (insertError) {
      console.error('[recurrence] insert failed:', insertError.message)
      // Hand the baton back so the next run can retry
      await admin.from('tasks').update({ recurrence_pattern: original }).eq('id', task.id)
      return 'error'
    }
    return 'created'
  } catch (error) {
    console.error('[recurrence] unexpected error:', error)
    return 'error'
  }
}
