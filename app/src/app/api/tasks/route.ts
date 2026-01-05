import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

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

  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        projects(name),
        assignee:profiles!assignee_id(id, full_name),
        creator:profiles!creator_id(id, full_name)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

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

    const { data: task, error } = await supabase
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
        projects(name),
        assignee:profiles!assignee_id(id, full_name)
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

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        projects(name),
        assignee:profiles!assignee_id(id, full_name)
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
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', ids)

      if (error) throw error

      return NextResponse.json({ message: `Deleted ${ids.length} tasks` })
    } else if (taskId) {
      // Single delete
      const { error } = await supabase
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
