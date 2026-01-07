import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Service role client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params
    
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this workspace (using admin client)
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get project count (using admin client)
    const { count: projectCount } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    // Get task count (across all projects in workspace)
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('workspace_id', workspaceId)

    let taskCount = 0
    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id)
      const { count } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
      taskCount = count || 0
    }

    // Get member count
    const { count: memberCount } = await supabaseAdmin
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    return NextResponse.json({
      projectCount: projectCount || 0,
      taskCount: taskCount,
      memberCount: memberCount || 0,
    })
  } catch (error: any) {
    console.error('Error fetching workspace stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workspace stats' },
      { status: 500 }
    )
  }
}
