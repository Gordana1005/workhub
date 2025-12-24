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

export async function getTasks(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:profiles!assignee_id(id, email, full_name),
        creator:profiles!created_by(id, email, full_name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching tasks:', error)
    throw error
  }
}

export async function updateTask(taskId: string, updates: any) {
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    return task
  } catch (error) {
    console.error('Error updating task:', error)
    throw error
  }
}
