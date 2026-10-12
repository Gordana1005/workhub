/** Shared helpers for project screens (list, cards, overview, detail). */

export interface ProjectMemberPreview {
  id: string
  username: string
  avatar_url: string | null
}

export interface ProjectSummary {
  id: string
  name: string
  description: string | null
  color: string | null
  status: string
  start_date: string | null
  end_date: string | null
  created_at: string
  logo_url: string | null
  taskCount?: number
  completedTaskCount?: number
  memberCount?: number
  members?: ProjectMemberPreview[]
}

export type StatusKey = 'active' | 'inProgress' | 'planning' | 'onHold' | 'completed' | 'archived'

/** Normalises the several spellings of a status stored in the database. */
export function statusKey(status: string): StatusKey | null {
  switch (status) {
    case 'active':
      return 'active'
    case 'in_progress':
    case 'in-progress':
      return 'inProgress'
    case 'planning':
      return 'planning'
    case 'on_hold':
    case 'on-hold':
      return 'onHold'
    case 'completed':
      return 'completed'
    case 'archived':
      return 'archived'
    default:
      return null
  }
}

/** Filter group: in-progress projects count as active. */
export function statusGroup(status: string): string {
  const key = statusKey(status)
  if (key === 'inProgress') return 'active'
  return key ?? status
}

/** Lower comes first: live work before finished work. */
export function statusRank(status: string): number {
  switch (statusGroup(status)) {
    case 'active':
      return 0
    case 'planning':
      return 1
    case 'onHold':
      return 2
    case 'completed':
      return 3
    case 'archived':
      return 4
    default:
      return 1
  }
}

export function statusDotClass(status: string): string {
  switch (statusKey(status)) {
    case 'active':
      return 'bg-success'
    case 'inProgress':
    case 'completed':
      return 'bg-primary'
    case 'onHold':
      return 'bg-warning'
    default:
      return 'bg-text-muted'
  }
}

export function progressOf(done: number, total: number): number {
  if (!total) return 0
  return Math.min(100, Math.round((done / total) * 100))
}

/** Parses 'YYYY-MM-DD' or a full timestamp as a local calendar day. */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null
  const [datePart] = value.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  if (!y || !m || !d) {
    const fallback = new Date(value)
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }
  return new Date(y, m - 1, d)
}

export function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Whole days from today to the given day (negative = in the past). */
export function daysUntil(value: string | null | undefined): number | null {
  const day = parseDay(value)
  if (!day) return null
  return Math.round((day.getTime() - startOfToday().getTime()) / 86_400_000)
}

/** Readable text colour for a user-chosen background colour (#rrggbb). */
export function readableOn(hex: string | null | undefined): string {
  const value = (hex || '').replace('#', '')
  if (value.length !== 6) return '#ffffff'
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return '#ffffff'
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.68 ? '#16181D' : '#ffffff'
}

/** Swatches offered when creating a task category. */
export const CATEGORY_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#e11d48', '#14b8a6', '#f59e0b']
