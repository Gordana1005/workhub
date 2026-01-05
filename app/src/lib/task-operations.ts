import { supabase } from './supabase'

export async function createTask(
  workspaceId: string,
  title: string,
  options?: {
    description?: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: string
    assigneeId?: string
    projectId?: string
    category?: string
  }
) {
  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        title,
        description: options?.description || '',
        priority: options?.priority || 'medium',
        due_date: options?.dueDate || null,
        assignee_id: options?.assigneeId,
        project_id: options?.projectId,
        category: options?.category
      })
    })

    if (!response.ok) throw new Error('Failed to create task')
    return await response.json()
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
    const response = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, ...updates })
    })

    if (!response.ok) throw new Error('Failed to update task')
    return await response.json()
  } catch (error) {
    console.error('Error updating task:', error)
    throw error
  }
}

export async function deleteTask(taskId: string) {
  try {
    const response = await fetch(`/api/tasks?id=${taskId}`, {
      method: 'DELETE'
    })

    if (!response.ok) throw new Error('Failed to delete task')
    return await response.json()
  } catch (error) {
    console.error('Error deleting task:', error)
    throw error
  }
}

export async function bulkUpdateTasks(taskIds: string[], updates: any) {
  try {
    // Update tasks in parallel
    const promises = taskIds.map(id => updateTask(id, updates))
    return await Promise.all(promises)
  } catch (error) {
    console.error('Error bulk updating tasks:', error)
    throw error
  }
}

export async function bulkDeleteTasks(taskIds: string[]) {
  try {
    const response = await fetch(`/api/tasks?bulkIds=${taskIds.join(',')}`, {
      method: 'DELETE'
    })

    if (!response.ok) throw new Error('Failed to delete tasks')
    return await response.json()
  } catch (error) {
    console.error('Error bulk deleting tasks:', error)
    throw error
  }
}
