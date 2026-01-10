import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Service role client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const { workspace_id, title, description, priority, due_date, project_id, assignee_id, category } = body

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
    const { id, ...updates } = body

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        projects(name)
      `)
      .single()

    if (error) throw error

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
      const ids = bulkIds.split(',')
      const { error } = await supabaseAdmin
        .from('tasks')
        .delete()
        .in('id', ids)

      if (error) throw error

      return NextResponse.json({ message: `Deleted ${ids.length} tasks` })
    } else if (taskId) {
      // Single delete
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
