/**
 * Keeps a task's `status`, `is_completed` and `completed_at` consistent:
 * status 'Done' <=> is_completed. Pure so it can be unit-tested.
 *
 * @param updates the (already whitelisted) fields the client wants to change
 * @param current the task as it is stored now
 * @param now     injectable clock for tests
 */
export function syncCompletion(
  updates: Record<string, any>,
  current: { status?: string | null; completed_at?: string | null } | null | undefined,
  now: () => string = () => new Date().toISOString()
): Record<string, any> {
  const patch: Record<string, any> = { ...updates }
  if (typeof patch.status === 'string') {
    patch.is_completed = patch.status === 'Done'
  } else if (typeof patch.is_completed === 'boolean') {
    if (patch.is_completed) patch.status = 'Done'
    else if (!current?.status || current.status === 'Done') patch.status = 'To Do'
  }
  if (typeof patch.is_completed === 'boolean') {
    patch.completed_at = patch.is_completed ? (patch.completed_at || current?.completed_at || now()) : null
  }
  return patch
}
