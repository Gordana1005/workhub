import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getWorkspaceRole, omitKeys } from '@/lib/api-access'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Service role client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function notifyUsers(entries: Array<{ user_id: string; workspace_id: string; type: string; title: string; message: string; link?: string }>) {
  if (!entries.length) return
  await supabaseAdmin.from('notifications').insert(entries.map(e => ({ ...e, read: false })))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id') || searchParams.get('workspaceId')
  const projectId = searchParams.get('project_id') || searchParams.get('projectId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}
      }
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user has access to this workspace
  const { data: membership } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    let query = supabaseAdmin
      .from('tasks')
      .select(`
        *,
        projects(name, workspace_id, color),
        assignee:profiles!tasks_assignee_id_fkey(id, username),
        creator:profiles!tasks_creator_id_fkey(id, username)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(2000)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: tasks, error } = await query

    if (error) throw error

    return NextResponse.json(tasks)
  } catch (error: any) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}
      }
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { workspace_id, title, description, priority, due_date, project_id, assignee_id, category, estimated_hours, tags } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    // Verify workspace access
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // The project must belong to the same workspace (prevents cross-workspace writes)
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('workspace_id', workspace_id)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: 'Project not found in this workspace' }, { status: 400 })
    }

    // Assignee (if different from the caller) must be a workspace member
    if (assignee_id && assignee_id !== user.id) {
      const assigneeRole = await getWorkspaceRole(supabaseAdmin, workspace_id, assignee_id)
      if (!assigneeRole) {
        return NextResponse.json({ error: 'Assignee is not a member of this workspace' }, { status: 400 })
      }
    }

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        workspace_id,
        title,
        description,
        priority: priority || 'medium',
        due_date,
        project_id,
        assignee_id: assignee_id || user.id,
        creator_id: user.id,
        category,
        ...(typeof estimated_hours === 'number' && estimated_hours > 0 ? { estimated_hours } : {}),
        ...(Array.isArray(tags) && tags.length > 0 ? { tags } : {}),
        status: 'To Do'
      })
      .select(`
        *,
        projects(name)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(task)
  } catch (error: any) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}
      }
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, ...rawUpdates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Fetch current task for comparison
    const { data: current } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!current) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Caller must belong to the task's workspace
    const role = await getWorkspaceRole(supabaseAdmin, current.workspace_id, user.id)
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Never allow moving a task between workspaces / rewriting ownership
    const updates = omitKeys(rawUpdates, ['workspace_id', 'creator_id', 'created_at'])

    // Moving to another project is only allowed within the same workspace
    if (updates.project_id && updates.project_id !== current.project_id) {
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('id', updates.project_id)
        .eq('workspace_id', current.workspace_id)
        .maybeSingle()
      if (!project) {
        return NextResponse.json({ error: 'Project not found in this workspace' }, { status: 400 })
      }
    }

    // Keep is_completed / status / completed_at consistent: 'Done' <=> completed.
    const patch: Record<string, any> = { ...updates }
    if (typeof patch.status === 'string') {
      patch.is_completed = patch.status === 'Done'
    } else if (typeof patch.is_completed === 'boolean') {
      if (patch.is_completed) patch.status = 'Done'
      else if (!current?.status || current.status === 'Done') patch.status = 'To Do'
    }
    if (typeof patch.is_completed === 'boolean') {
      patch.completed_at = patch.is_completed ? (patch.completed_at || current?.completed_at || new Date().toISOString()) : null
    }

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select(`
        *,
        projects(name)
      `)
      .single()

    if (error) throw error

    // Task completion / status change notification
    const wasCompleted = current?.is_completed || current?.status === 'Done'
    const nowCompleted = (task as any)?.is_completed || (task as any)?.status === 'Done'
    const statusChanged = current?.status !== (task as any)?.status || current?.is_completed !== (task as any)?.is_completed

    if (task && statusChanged) {
      const workspaceId = (task as any).workspace_id
      const title = (task as any).title || 'Task updated'

      const { data: members } = await supabaseAdmin
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)

      const baseMessage = wasCompleted
        ? `${title} was reopened`
        : nowCompleted
          ? `${title} was completed`
          : `${title} was updated`

      const notifications = (members || [])
        .filter((m: any) => m.user_id !== user.id)
        .map((m: any) => ({
          user_id: m.user_id,
          workspace_id: workspaceId,
          type: nowCompleted ? 'task_completed' : 'task_updated',
          title: nowCompleted ? 'Task completed' : 'Task updated',
          message: baseMessage,
          link: '/dashboard/tasks'
        }))

      await notifyUsers(notifications)
    }

    return NextResponse.json(task)
  } catch (error: any) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('id')
  const bulkIds = searchParams.get('bulkIds')

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}
      }
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (bulkIds) {
      // Bulk delete
      const ids = bulkIds.split(',').map(s => s.trim()).filter(Boolean).slice(0, 500)

      // Only delete tasks that live in workspaces the caller belongs to
      const { data: found } = await supabaseAdmin
        .from('tasks')
        .select('id, workspace_id')
        .in('id', ids)

      const workspaceIds = Array.from(new Set((found || []).map((t: any) => t.workspace_id)))
      const allowedWorkspaces = new Set<string>()
      for (const wsId of workspaceIds) {
        if (await getWorkspaceRole(supabaseAdmin, wsId, user.id)) allowedWorkspaces.add(wsId)
      }
      const allowedIds = (found || [])
        .filter((t: any) => allowedWorkspaces.has(t.workspace_id))
        .map((t: any) => t.id)

      if (allowedIds.length === 0) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const { error } = await supabaseAdmin
        .from('tasks')
        .delete()
        .in('id', allowedIds)

      if (error) throw error

      return NextResponse.json({ message: `Deleted ${allowedIds.length} tasks` })
    } else if (taskId) {
      // Single delete - caller must belong to the task's workspace
      const { data: existing } = await supabaseAdmin
        .from('tasks')
        .select('workspace_id')
        .eq('id', taskId)
        .maybeSingle()

      if (!existing) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      if (!(await getWorkspaceRole(supabaseAdmin, existing.workspace_id, user.id))) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const { error } = await supabaseAdmin
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      return NextResponse.json({ message: 'Task deleted' })
    } else {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
