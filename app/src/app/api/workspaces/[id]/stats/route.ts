import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabaseAccessToken = cookieStore.get('sb-access-token')?.value
    const supabaseRefreshToken = cookieStore.get('sb-refresh-token')?.value

    if (!supabaseAccessToken || !supabaseRefreshToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${supabaseAccessToken}`,
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = params.id

    // Verify user has access to this workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get project count
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    // Get task count (across all projects in workspace)
    const { count: taskCount } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id)', { count: 'exact', head: true })
      .eq('project.workspace_id', workspaceId)

    // Get member count
    const { count: memberCount } = await supabase
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    return NextResponse.json({
      projectCount: projectCount || 0,
      taskCount: taskCount || 0,
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
