import { describe, expect, it } from 'vitest'
import { syncCompletion } from './task-status'

const NOW = () => '2026-06-15T10:00:00.000Z'

describe('syncCompletion', () => {
  it('status Done completes the task and stamps completed_at', () => {
    const patch = syncCompletion({ status: 'Done' }, { status: 'In Progress' }, NOW)
    expect(patch.is_completed).toBe(true)
    expect(patch.completed_at).toBe(NOW())
  })

  it('any other status un-completes the task', () => {
    const patch = syncCompletion({ status: 'Review' }, { status: 'Done', completed_at: 'x' }, NOW)
    expect(patch.is_completed).toBe(false)
    expect(patch.completed_at).toBeNull()
  })

  it('is_completed=true sets status Done', () => {
    const patch = syncCompletion({ is_completed: true }, { status: 'To Do' }, NOW)
    expect(patch.status).toBe('Done')
    expect(patch.completed_at).toBe(NOW())
  })

  it('keeps the original completed_at when re-completing', () => {
    const patch = syncCompletion({ is_completed: true }, { status: 'Done', completed_at: '2026-01-01T00:00:00Z' }, NOW)
    expect(patch.completed_at).toBe('2026-01-01T00:00:00Z')
  })

  it('is_completed=false moves Done back to To Do but keeps other statuses', () => {
    expect(syncCompletion({ is_completed: false }, { status: 'Done' }, NOW).status).toBe('To Do')
    expect(syncCompletion({ is_completed: false }, { status: null }, NOW).status).toBe('To Do')
    expect(syncCompletion({ is_completed: false }, { status: 'Review' }, NOW).status).toBeUndefined()
  })

  it('leaves unrelated updates untouched and does not mutate the input', () => {
    const updates = { title: 'x' }
    const patch = syncCompletion(updates, { status: 'Done' }, NOW)
    expect(patch).toEqual({ title: 'x' })
    expect(patch).not.toBe(updates)
  })
})
