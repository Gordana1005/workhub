/**
 * Subtask helpers shared by the API routes and the screens.
 *
 * Subtasks are rows of `tasks` with `parent_task_id` set (see database/migrations/026_subtasks.sql).
 * The column may not exist yet (migration not applied): every helper that talks to the database
 * treats a "missing column / table" error as "no subtasks" and never throws, so task loading
 * keeps working either way.
 */

/** Postgres / PostgREST error codes that mean "that column or table does not exist (yet)". */
export const MISSING_SCHEMA_CODES = ['42703', 'PGRST204', '42P01', 'PGRST205']

export function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { code, message } = error as { code?: unknown; message?: unknown }
  if (typeof code === 'string' && MISSING_SCHEMA_CODES.includes(code)) return true
  return typeof message === 'string' && /parent_task_id/i.test(message) && /(does not exist|schema cache|could not find)/i.test(message)
}

export interface SubtaskCounts {
  total: number
  done: number
}

export interface SubtaskProgress extends SubtaskCounts {
  /** 0-100, rounded */
  percent: number
  complete: boolean
}

type DoneLike = { is_completed?: boolean | null; status?: string | null }

export function isRowDone(row: DoneLike): boolean {
  return !!row.is_completed || row.status === 'Done'
}

/** Progress numbers for a parent task. Done is clamped to total; an empty list is 0% and not "complete". */
export function subtaskProgress(total?: number | null, done?: number | null): SubtaskProgress {
  const safeTotal = Math.max(0, Math.floor(Number(total) || 0))
  const safeDone = Math.min(safeTotal, Math.max(0, Math.floor(Number(done) || 0)))
  return {
    total: safeTotal,
    done: safeDone,
    percent: safeTotal === 0 ? 0 : Math.round((safeDone / safeTotal) * 100),
    complete: safeTotal > 0 && safeDone === safeTotal,
  }
}

/** Groups subtask rows by their parent: { [parentId]: { total, done } }. Rows without a parent are ignored. */
export function countSubtasksByParent(
  rows: Array<DoneLike & { parent_task_id?: string | null }> | null | undefined
): Record<string, SubtaskCounts> {
  const result: Record<string, SubtaskCounts> = {}
  for (const row of rows || []) {
    const parent = row.parent_task_id
    if (!parent) continue
    const entry = result[parent] || (result[parent] = { total: 0, done: 0 })
    entry.total += 1
    if (isRowDone(row)) entry.done += 1
  }
  return result
}

/** Adds `subtask_total` / `subtask_done` to every task (0 / 0 when it has none). */
export function withSubtaskCounts<T extends { id: string }>(
  tasks: T[],
  counts: Record<string, SubtaskCounts>
): Array<T & { subtask_total: number; subtask_done: number }> {
  return tasks.map((task) => ({
    ...task,
    subtask_total: counts[task.id]?.total ?? 0,
    subtask_done: counts[task.id]?.done ?? 0,
  }))
}

/** In-memory filter for queries that already select `*` (rows without the column pass through). */
export function topLevelOnly<T extends { parent_task_id?: string | null }>(rows: T[] | null | undefined): T[] {
  return (rows || []).filter((row) => !row.parent_task_id)
}

/**
 * Runs a task query restricted to top-level tasks (`parent_task_id IS NULL`). When the column does
 * not exist yet the query is run again without the restriction.
 *
 *   const { data } = await runTopLevel((topLevel) => {
 *     let q = admin.from('tasks').select('*').eq('workspace_id', id)
 *     if (topLevel) q = q.is('parent_task_id', null)
 *     return q
 *   })
 */
export async function runTopLevel<R extends { error?: unknown }>(run: (topLevel: boolean) => PromiseLike<R>): Promise<R> {
  const first = await run(true)
  if (first.error && isMissingSchemaError(first.error)) return run(false)
  return first
}

// Minimal structural type so both the browser client and the service-role client fit.
type AnyClient = { from: (table: string) => any }

/**
 * Subtask counts per parent for a workspace (optionally one project): ONE query, grouped in memory.
 * Returns {} when subtasks are unavailable.
 */
export async function fetchSubtaskCounts(
  client: AnyClient,
  scope: { workspaceId: string; projectId?: string | null }
): Promise<Record<string, SubtaskCounts>> {
  try {
    let query = client
      .from('tasks')
      .select('parent_task_id, is_completed, status')
      .eq('workspace_id', scope.workspaceId)
      .not('parent_task_id', 'is', null)
      .limit(10000)
    if (scope.projectId) query = query.eq('project_id', scope.projectId)
    const { data, error } = await query
    if (error) return {}
    return countSubtasksByParent(data)
  } catch {
    return {}
  }
}

/** Adds the subtask counts to a list of top-level tasks (one extra grouped query, never throws). */
export async function attachSubtaskCounts<T extends { id: string }>(
  client: AnyClient,
  tasks: T[],
  scope: { workspaceId: string; projectId?: string | null }
): Promise<Array<T & { subtask_total: number; subtask_done: number }>> {
  const counts = await fetchSubtaskCounts(client, scope)
  return withSubtaskCounts(tasks, counts)
}

/** Ids of every subtask in a workspace (used to subtract them from embedded `tasks(...)` counts). */
export async function fetchSubtaskIds(client: AnyClient, workspaceId: string): Promise<Set<string>> {
  try {
    const { data, error } = await client
      .from('tasks')
      .select('id')
      .eq('workspace_id', workspaceId)
      .not('parent_task_id', 'is', null)
      .limit(10000)
    if (error) return new Set()
    return new Set<string>((data || []).map((row: { id: string }) => row.id))
  } catch {
    return new Set()
  }
}

/** Trims, de-blanks and caps a list of subtask titles coming from a request body. */
export function sanitizeSubtaskTitles(input: unknown, max = 50, maxLength = 200): string[] {
  if (!Array.isArray(input)) return []
  const titles: string[] = []
  for (const item of input) {
    const raw = typeof item === 'string' ? item : item && typeof item === 'object' ? (item as { title?: unknown }).title : ''
    if (typeof raw !== 'string') continue
    const title = raw.replace(/\s+/g, ' ').trim().slice(0, maxLength)
    if (title) titles.push(title)
    if (titles.length >= max) break
  }
  return titles
}

/** Markdown checklist used as a fallback when real subtasks are unavailable. */
export function subtasksToChecklist(titles: string[]): string {
  return titles.map((title) => `- [ ] ${title}`).join('\n')
}
