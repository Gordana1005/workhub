import { supabase } from './supabase'

export async function createTask(
  projectId: string,
  title: string,
  options?: {
    description?: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: string
    assigneeId?: string
  }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('User not authenticated')
    }
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title,
        description: options?.description || '',
        priority: options?.priority || 'medium',
        due_date: options?.dueDate || null,
        assignee_id: options?.assigneeId || user.id,
        created_by: user.id,
        is_completed: false
      })
      .select()
      .single()
    if (error) throw error
    return task
  } catch (error) {
    console.error('Error creating task:', error)
    throw error
  }
}
