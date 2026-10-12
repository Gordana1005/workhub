import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { runTopLevel } from '@/lib/subtasks'
import { getAuthUser } from '@/lib/supabase-server'
import { ServerTimer } from '@/lib/server-timing'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

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
    
    const timer = new ServerTimer()
    const user = await timer.time('auth', getAuthUser())
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Membership check + the three counts are independent: one round trip instead of four
    // (tasks are counted through an inner join on projects, same as "tasks of this workspace's projects")
    const [{ data: membership }, { count: projectCount }, { count: rawTaskCount }, { count: memberCount }] =
      await timer.time(
        'db',
        Promise.all([
          supabaseAdmin
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', user.id)
            .single(),
          supabaseAdmin
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId),
          runTopLevel((topLevel) => {
            let q = supabaseAdmin
              .from('tasks')
              .select('id, projects!inner(workspace_id)', { count: 'exact', head: true })
              .eq('projects.workspace_id', workspaceId)
            if (topLevel) q = q.is('parent_task_id', null)
            return q
          }),
          supabaseAdmin
            .from('workspace_members')
            .select('user_id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId),
        ])
      )

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return timer.apply(
      NextResponse.json({
        projectCount: projectCount || 0,
        taskCount: rawTaskCount || 0,
        memberCount: memberCount || 0,
      })
    )
  } catch (error: any) {
    console.error('Error fetching workspace stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workspace stats' },
      { status: 500 }
    )
  }
}
