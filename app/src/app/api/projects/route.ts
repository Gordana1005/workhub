import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function notifyUsers(entries: Array<{ user_id: string; workspace_id: string; type: string; title: string; message: string; link?: string }>) {
  if (!entries.length) return
  await supabaseAdmin.from('notifications').insert(entries.map(e => ({ ...e, read: false })))
}

// Create auth client
async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      }
    }
  )
}

// GET /api/projects
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspace_id')
    const projectId = searchParams.get('id')

    if (!workspaceId && !projectId) {
      return NextResponse.json({ error: 'workspace_id or id is required' }, { status: 400 })
    }

    // If fetching single project
    if (projectId) {
      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .select(`
          *,
          owner:profiles!creator_id(id, username, avatar_url),
          tasks(id, title, priority, is_completed)
        `)
        .eq('id', projectId)
        .single()

      if (error) throw error
      return NextResponse.json({ project })
    }

    // Verify workspace access
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        owner:profiles!creator_id(id, username, avatar_url),
        tasks(id, is_completed)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate task counts
    const projectsWithCounts = projects?.map(p => ({
      ...p,
      taskCount: p.tasks?.length || 0,
      completedTaskCount: p.tasks?.filter((t: any) => t.is_completed).length || 0
    }))

    return NextResponse.json({ projects: projectsWithCounts })
  } catch (error: any) {
    console.error('Error in GET /api/projects:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/projects
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspace_id, name, description, status, color, logo_url, budget, start_date, end_date } = body

    if (!workspace_id || !name) {
      return NextResponse.json({ error: 'workspace_id and name are required' }, { status: 400 })
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

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        workspace_id,
        name,
        description,
        status: status || 'active',
        color,
        logo_url,
        budget,
        start_date,
        end_date,
        creator_id: user.id
      })
      .select()
      .single()

    if (error) throw error

    // Notify workspace members (except creator) about the new project
    const { data: members } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspace_id)

    const notifications = (members || [])
      .filter((m: any) => m.user_id !== user.id)
      .map((m: any) => ({
        user_id: m.user_id,
        workspace_id,
        type: 'project_created',
        title: 'New project created',
        message: `${project.name} was created`,
        link: `/dashboard/projects/${project.id}`
      }))

    await notifyUsers(notifications)

    return NextResponse.json({ project }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/projects:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/projects
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ project })
  } catch (error: any) {
    console.error('Error in PATCH /api/projects:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/projects
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // First delete related tasks
    await supabaseAdmin.from('tasks').delete().eq('project_id', id)

    // Then delete project
    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/projects:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
