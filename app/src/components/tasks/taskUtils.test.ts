import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  compareTasks,
  dayKey,
  isDone,
  isOverdue,
  normalizeTask,
  parseDayKey,
  priorityLabel,
  priorityRank,
  statusLabel,
  toDayKey,
  todayKey,
} from './taskUtils'
import type { Task } from './types'

const t = (key: string) => `t:${key}`
const task = (over: Partial<Task> = {}): Task => ({ id: '1', title: 'x', status: 'To Do', priority: 'medium', ...over })

describe('day keys', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 23, 30)) // late evening local time
  })
  afterEach(() => vi.useRealTimers())

  it('toDayKey / todayKey use the local calendar day', () => {
    expect(toDayKey(new Date(2026, 0, 9))).toBe('2026-01-09')
    expect(todayKey()).toBe('2026-06-15')
    expect(todayKey(1)).toBe('2026-06-16')
    expect(todayKey(-15)).toBe('2026-05-31')
  })

  it('dayKey reads stored dates without timezone shifts', () => {
    expect(dayKey('2026-03-04')).toBe('2026-03-04')
    expect(dayKey('2026-03-04T23:59:59Z')).toBe('2026-03-04')
    expect(dayKey(null)).toBeNull()
    expect(dayKey('')).toBeNull()
    expect(dayKey('garbage')).toBeNull()
  })

  it('parseDayKey builds a local date', () => {
    const d = parseDayKey('2026-02-03')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 1, 3])
  })

  it('isOverdue only flags open tasks due before today', () => {
    expect(isOverdue(task({ due_date: '2026-06-14' }))).toBe(true)
    expect(isOverdue(task({ due_date: '2026-06-15' }))).toBe(false)
    expect(isOverdue(task({ due_date: '2026-06-16' }))).toBe(false)
    expect(isOverdue(task({ due_date: '2026-06-01', status: 'Done' }))).toBe(false)
    expect(isOverdue(task({ due_date: '2026-06-01', is_completed: true }))).toBe(false)
    expect(isOverdue(task({ due_date: null }))).toBe(false)
  })
})

describe('isDone / priorityRank', () => {
  it('treats either flag as done', () => {
    expect(isDone({ is_completed: true, status: 'To Do' })).toBe(true)
    expect(isDone({ is_completed: false, status: 'Done' })).toBe(true)
    expect(isDone({ is_completed: false, status: 'Review' })).toBe(false)
  })

  it('ranks urgent first and defaults to medium', () => {
    expect(priorityRank('urgent')).toBeLessThan(priorityRank('high'))
    expect(priorityRank('high')).toBeLessThan(priorityRank('medium'))
    expect(priorityRank('medium')).toBeLessThan(priorityRank('low'))
    expect(priorityRank(undefined)).toBe(priorityRank('medium'))
    expect(priorityRank('weird')).toBe(2)
  })
})

describe('compareTasks', () => {
  it('sorts soonest due first, undated last', () => {
    const list = [task({ id: 'c' }), task({ id: 'b', due_date: '2026-02-01' }), task({ id: 'a', due_date: '2026-01-01' })]
    expect(list.sort(compareTasks).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('breaks ties by priority, then newest first', () => {
    const list = [
      task({ id: 'low', priority: 'low', due_date: '2026-01-01' }),
      task({ id: 'urgent', priority: 'urgent', due_date: '2026-01-01' }),
      task({ id: 'old', created_at: '2026-01-01' }),
      task({ id: 'new', created_at: '2026-02-01' }),
    ]
    const ids = list.sort(compareTasks).map((x) => x.id)
    expect(ids.indexOf('urgent')).toBeLessThan(ids.indexOf('low'))
    expect(ids.indexOf('new')).toBeLessThan(ids.indexOf('old'))
  })
})

describe('normalizeTask', () => {
  it('maps the joined projects relation to project', () => {
    const n = normalizeTask({ id: '1', title: 'x', projects: { name: 'P', color: '#fff' } })
    expect(n.project).toEqual({ name: 'P', color: '#fff' })
  })

  it('accepts an array relation and fills in defaults', () => {
    const n = normalizeTask({ id: '1', projects: [{ name: 'P' }] })
    expect(n.project?.name).toBe('P')
    expect(n.status).toBe('To Do')
    expect(n.priority).toBe('medium')
  })

  it('derives status Done from is_completed and handles a missing project', () => {
    const n = normalizeTask({ id: '1', is_completed: true })
    expect(n.status).toBe('Done')
    expect(n.project).toBeNull()
  })
})

describe('labels', () => {
  it('maps known priorities / statuses to translation keys and passes unknown through', () => {
    expect(priorityLabel(t, 'urgent')).toBe('t:priorityUrgent')
    expect(priorityLabel(t, 'custom')).toBe('custom')
    expect(priorityLabel(t, null)).toBe('')
    expect(statusLabel(t, 'In Progress')).toBe('t:statusInProgress')
    expect(statusLabel(t, 'Whatever')).toBe('Whatever')
  })
})
