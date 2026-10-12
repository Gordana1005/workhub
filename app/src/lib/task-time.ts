/**
 * Time-per-task helpers: duration formatting / parsing, estimate progress and per-task totals.
 * Pure (except `fetchLoggedSecondsByTask`, which never throws).
 */

/** Translator shape used by `formatDuration` (a next-intl `t` scoped to the tasks namespace fits). */
export type DurationTranslate = (key: 'durationHM' | 'durationH' | 'durationM' | 'durationUnderMinute', values?: Record<string, number>) => string

/** "1h 20m", "2h", "45m", "<1m" (0 -> "0m"), localised through the supplied translator. */
export function formatDuration(seconds: number, t: DurationTranslate): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  if (safe > 0 && safe < 30) return t('durationUnderMinute')
  const totalMinutes = Math.round(safe / 60)
  if (totalMinutes < 1) return t('durationM', { minutes: 0 })
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return t('durationM', { minutes })
  if (minutes === 0) return t('durationH', { hours })
  return t('durationHM', { hours, minutes })
}

/** "01:05:09" style clock for a running timer. */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return [h, m, s].map((part) => String(part).padStart(2, '0')).join(':')
}

/**
 * Parses what people type for a duration into seconds. Accepts
 * "1h 20m", "1h", "45m", "1.5h", "1,5 h", "1:30" (h:mm), "90" (minutes) and the Macedonian "1 ч 20 мин".
 * Returns null for anything else, or for zero / negative / absurd (> 24h) values.
 */
export function parseDuration(input: string): number | null {
  const text = (input || '').trim().toLowerCase().replace(/,/g, '.')
  if (!text) return null

  const clock = /^(\d{1,3}):(\d{1,2})$/.exec(text)
  if (clock) {
    const minutes = Number(clock[2])
    if (minutes > 59) return null
    return clampSeconds(Number(clock[1]) * 3600 + minutes * 60)
  }

  const token = /(\d+(?:\.\d+)?)\s*([a-zа-яё]*)/g
  let total = 0
  let consumed = 0
  let count = 0
  let match: RegExpExecArray | null
  while ((match = token.exec(text)) !== null) {
    const between = text.slice(consumed, match.index)
    if (between.replace(/[\s,]|and|и/g, '') !== '') return null
    consumed = match.index + match[0].length
    count += 1
    const value = Number(match[1])
    const unit = match[2]
    if (!unit) {
      if (count > 1 || /\d/.test(text.slice(consumed))) return null
      total += value * 60 // a bare number is minutes
    } else if (/^(h|hr|hrs|hour|hours|ч|час|часа|часови)$/.test(unit)) {
      total += value * 3600
    } else if (/^(m|min|mins|minute|minutes|м|мин|минути|минута)$/.test(unit)) {
      total += value * 60
    } else if (/^(s|sec|secs|second|seconds|с|сек)$/.test(unit)) {
      total += value
    } else {
      return null
    }
  }
  if (count === 0 || text.slice(consumed).replace(/[\s,]/g, '') !== '') return null
  return clampSeconds(total)
}

function clampSeconds(seconds: number): number | null {
  const rounded = Math.round(seconds)
  if (!Number.isFinite(rounded) || rounded <= 0 || rounded > 24 * 3600) return null
  return rounded
}

export interface TimeProgress {
  /** 0-100 of the estimate used (capped), 0 when there is no estimate */
  percent: number
  over: boolean
  hasEstimate: boolean
  /** seconds over (>0) or left (<0 is never returned: left is reported as a positive `remaining`) */
  overBy: number
  remaining: number
}

/** Logged time against the task's estimate (`estimated_hours`). */
export function timeProgress(loggedSeconds: number, estimatedHours?: number | null): TimeProgress {
  const estimateSeconds = Math.round((Number(estimatedHours) || 0) * 3600)
  if (estimateSeconds <= 0) return { percent: 0, over: false, hasEstimate: false, overBy: 0, remaining: 0 }
  const logged = Math.max(0, loggedSeconds || 0)
  return {
    percent: Math.min(100, Math.round((logged / estimateSeconds) * 100)),
    over: logged > estimateSeconds,
    hasEstimate: true,
    overBy: Math.max(0, logged - estimateSeconds),
    remaining: Math.max(0, estimateSeconds - logged),
  }
}

/** Sums `duration` (seconds) per `task_id`; rows without a task are skipped. */
export function sumDurationsByTask(rows: Array<{ task_id?: string | null; duration?: number | null }> | null | undefined): Record<string, number> {
  const result: Record<string, number> = {}
  for (const row of rows || []) {
    if (!row.task_id) continue
    const seconds = Number(row.duration) || 0
    if (seconds <= 0) continue
    result[row.task_id] = (result[row.task_id] || 0) + seconds
  }
  return result
}

type AnyClient = { from: (table: string) => any }

/**
 * Total logged seconds per task for a workspace (all members). Pages through `time_entries`
 * (PostgREST caps a response at ~1000 rows) and groups in memory. Returns {} on any error.
 */
export async function fetchLoggedSecondsByTask(
  client: AnyClient,
  scope: { workspaceId: string; projectId?: string | null },
  maxPages = 10
): Promise<Record<string, number>> {
  const pageSize = 1000
  const rows: Array<{ task_id: string | null; duration: number | null }> = []
  try {
    for (let page = 0; page < maxPages; page++) {
      let query = client
        .from('time_entries')
        .select('task_id, duration')
        .eq('workspace_id', scope.workspaceId)
        .not('task_id', 'is', null)
        .order('created_at', { ascending: true })
        .range(page * pageSize, page * pageSize + pageSize - 1)
      if (scope.projectId) query = query.eq('project_id', scope.projectId)
      const { data, error } = await query
      if (error) return {}
      rows.push(...(data || []))
      if (!data || data.length < pageSize) break
    }
  } catch {
    return {}
  }
  return sumDurationsByTask(rows)
}
