import type { MemberOption, Priority, ProjectOption, Task } from './types'
import { getJsonCached } from '@/lib/api-cache'

export const STATUSES = ['To Do', 'In Progress', 'Review', 'Done'] as const
export const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low']

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

/** Theme-token classes for each priority (dot background + text colour). */
export const PRIORITY_TONE: Record<Priority, { dot: string; text: string }> = {
  urgent: { dot: 'bg-danger', text: 'text-danger' },
  high: { dot: 'bg-warning', text: 'text-warning' },
  medium: { dot: 'bg-primary', text: 'text-primary' },
  low: { dot: 'bg-text-muted', text: 'text-text-muted' },
}

/** Theme-token classes for each status (dot background). */
export const STATUS_DOT: Record<string, string> = {
  'To Do': 'bg-text-muted',
  'In Progress': 'bg-primary',
  Review: 'bg-warning',
  Done: 'bg-success',
}

export function priorityRank(priority?: string | null) {
  return PRIORITY_RANK[priority || 'medium'] ?? 2
}

export function isDone(task: Pick<Task, 'is_completed' | 'status'>) {
  return !!task.is_completed || task.status === 'Done'
}

type Translate = (key: string) => string

export function priorityLabel(t: Translate, priority?: string | null) {
  if (priority === 'low') return t('priorityLow')
  if (priority === 'medium') return t('priorityMedium')
  if (priority === 'high') return t('priorityHigh')
  if (priority === 'urgent') return t('priorityUrgent')
  return priority || ''
}

export function statusLabel(t: Translate, status?: string | null) {
  if (status === 'To Do') return t('statusToDo')
  if (status === 'In Progress') return t('statusInProgress')
  if (status === 'Review') return t('statusReview')
  if (status === 'Done') return t('statusDone')
  return status || ''
}

// ---------------------------------------------------------------------------
// Dates. Task due dates are plain calendar days, so they are compared and shown
// as local `YYYY-MM-DD` keys instead of being pushed through UTC conversions.
// ---------------------------------------------------------------------------

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function toDayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `YYYY-MM-DD` for a stored due date (or null when missing / invalid). */
export function dayKey(value?: string | null): string | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : toDayKey(parsed)
}

export function todayKey(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return toDayKey(date)
}

export function parseDayKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function isOverdue(task: Pick<Task, 'due_date' | 'is_completed' | 'status'>) {
  const due = dayKey(task.due_date)
  return !!due && !isDone(task) && due < todayKey()
}

/** Order used inside every group: soonest due first, then priority, then newest. */
export function compareTasks(a: Task, b: Task) {
  const dueA = dayKey(a.due_date)
  const dueB = dayKey(b.due_date)
  if (dueA !== dueB) {
    if (!dueA) return 1
    if (!dueB) return -1
    return dueA < dueB ? -1 : 1
  }
  const byPriority = priorityRank(a.priority) - priorityRank(b.priority)
  if (byPriority !== 0) return byPriority
  return (b.created_at || '').localeCompare(a.created_at || '')
}

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

/** The API returns the joined project as `projects`; the UI works with `project`. */
export function normalizeTask(raw: any): Task {
  const joined = raw?.project ?? raw?.projects
  const project = Array.isArray(joined) ? joined[0] : joined
  return {
    ...raw,
    status: raw?.status || (raw?.is_completed ? 'Done' : 'To Do'),
    priority: raw?.priority || 'medium',
    project: project ? { name: project.name, color: project.color } : null,
  }
}

export async function fetchProjects(workspaceId: string): Promise<ProjectOption[]> {
  // shared 30s cache: the tasks page, the quick-add form and the detail dialog all want the same list
  const data = await getJsonCached<any>(`/api/projects?workspace_id=${encodeURIComponent(workspaceId)}`)
  return (data.projects || []).map((p: any) => ({ id: p.id, name: p.name, color: p.color }))
}

export async function fetchMembers(workspaceId: string, unknownLabel: string): Promise<MemberOption[]> {
  const data = await getJsonCached<any>(`/api/team?workspace_id=${encodeURIComponent(workspaceId)}`)
  const seen = new Set<string>()
  const members: MemberOption[] = []
  for (const row of data.members || []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const id = profile?.id || row.user_id
    if (!id || seen.has(id)) continue
    seen.add(id)
    members.push({
      id,
      username: profile?.username || profile?.email || unknownLabel,
      email: profile?.email || '',
      avatar_url: profile?.avatar_url || null,
      role: row.role || undefined,
    })
  }
  members.sort((a, b) => a.username.localeCompare(b.username))
  return members
}

/** Workspace members, shared by every picker (the underlying request is cached for 30s and de-duplicated). */
export function getWorkspaceMembers(workspaceId: string, unknownLabel: string): Promise<MemberOption[]> {
  return fetchMembers(workspaceId, unknownLabel)
}
