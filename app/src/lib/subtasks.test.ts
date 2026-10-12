import { describe, expect, it } from 'vitest'
import {
  countSubtasksByParent,
  isMissingSchemaError,
  runTopLevel,
  sanitizeSubtaskTitles,
  subtaskProgress,
  subtasksToChecklist,
  topLevelOnly,
  withSubtaskCounts,
} from './subtasks'

describe('isMissingSchemaError', () => {
  it('recognises the Postgres / PostgREST codes for a missing column or table', () => {
    for (const code of ['42703', 'PGRST204', '42P01', 'PGRST205']) {
      expect(isMissingSchemaError({ code, message: 'x' })).toBe(true)
    }
  })
  it('recognises the message when no code is present', () => {
    expect(isMissingSchemaError({ message: 'column tasks.parent_task_id does not exist' })).toBe(true)
  })
  it('ignores unrelated errors', () => {
    expect(isMissingSchemaError({ code: '23505', message: 'duplicate key' })).toBe(false)
    expect(isMissingSchemaError(null)).toBe(false)
  })
})

describe('subtaskProgress', () => {
  it('computes percent and completeness', () => {
    expect(subtaskProgress(5, 2)).toEqual({ total: 5, done: 2, percent: 40, complete: false })
    expect(subtaskProgress(3, 3)).toEqual({ total: 3, done: 3, percent: 100, complete: true })
  })
  it('handles empty, missing and out-of-range input', () => {
    expect(subtaskProgress(0, 0)).toEqual({ total: 0, done: 0, percent: 0, complete: false })
    expect(subtaskProgress(undefined, undefined).total).toBe(0)
    expect(subtaskProgress(2, 9).done).toBe(2)
    expect(subtaskProgress(2, -1).done).toBe(0)
  })
})

describe('countSubtasksByParent / withSubtaskCounts', () => {
  const rows = [
    { parent_task_id: 'a', is_completed: true },
    { parent_task_id: 'a', is_completed: false, status: 'To Do' },
    { parent_task_id: 'a', is_completed: false, status: 'Done' },
    { parent_task_id: 'b', is_completed: false },
    { parent_task_id: null, is_completed: true },
  ]
  it('groups per parent and counts done by flag or status', () => {
    expect(countSubtasksByParent(rows)).toEqual({ a: { total: 3, done: 2 }, b: { total: 1, done: 0 } })
    expect(countSubtasksByParent(null)).toEqual({})
  })
  it('attaches the counts to tasks (zeros when none)', () => {
    const tasks = withSubtaskCounts([{ id: 'a' }, { id: 'c' }], countSubtasksByParent(rows))
    expect(tasks[0]).toMatchObject({ subtask_total: 3, subtask_done: 2 })
    expect(tasks[1]).toMatchObject({ subtask_total: 0, subtask_done: 0 })
  })
})

describe('topLevelOnly', () => {
  it('drops rows that have a parent', () => {
    expect(topLevelOnly([{ id: 1 }, { id: 2, parent_task_id: 'x' }, { id: 3, parent_task_id: null }]).map((r) => r.id)).toEqual([1, 3])
    expect(topLevelOnly(undefined)).toEqual([])
  })
})

describe('runTopLevel', () => {
  it('returns the filtered result when it works', async () => {
    const calls: boolean[] = []
    const result = await runTopLevel(async (top) => {
      calls.push(top)
      return { data: [1], error: null }
    })
    expect(calls).toEqual([true])
    expect(result.data).toEqual([1])
  })
  it('retries without the filter when the column is missing', async () => {
    const calls: boolean[] = []
    const result = await runTopLevel(async (top) => {
      calls.push(top)
      return top ? { data: null, error: { code: '42703', message: 'nope' } } : { data: [1, 2], error: null }
    })
    expect(calls).toEqual([true, false])
    expect(result.data).toEqual([1, 2])
  })
  it('does not retry on other errors', async () => {
    const calls: boolean[] = []
    const result = await runTopLevel(async (top) => {
      calls.push(top)
      return { data: null, error: { code: '57014', message: 'timeout' } }
    })
    expect(calls).toEqual([true])
    expect(result.error).toBeTruthy()
  })
})

describe('sanitizeSubtaskTitles / subtasksToChecklist', () => {
  it('trims, drops blanks, accepts {title} objects and caps the list', () => {
    expect(sanitizeSubtaskTitles(['  a  ', '', '  ', { title: 'b' }, 5, null])).toEqual(['a', 'b'])
    expect(sanitizeSubtaskTitles(Array.from({ length: 80 }, (_, i) => `t${i}`))).toHaveLength(50)
    expect(sanitizeSubtaskTitles('nope')).toEqual([])
  })
  it('builds a markdown checklist', () => {
    expect(subtasksToChecklist(['one', 'two'])).toBe('- [ ] one\n- [ ] two')
  })
})
