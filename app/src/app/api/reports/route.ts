import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

// GET /api/reports
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspace_id')
    const reportType = searchParams.get('type') // tasks, time, finance, productivity

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
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

    switch (reportType) {
      case 'tasks': {
        const { data: tasks, error } = await supabaseAdmin
          .from('tasks')
          .select('*')
          .eq('workspace_id', workspaceId)

        if (error) throw error

        const stats = {
          total: tasks?.length || 0,
          completed: tasks?.filter(t => t.is_completed).length || 0,
          active: tasks?.filter(t => !t.is_completed).length || 0,
          byPriority: {
            urgent: tasks?.filter(t => t.priority === 'urgent').length || 0,
            high: tasks?.filter(t => t.priority === 'high').length || 0,
            medium: tasks?.filter(t => t.priority === 'medium').length || 0,
            low: tasks?.filter(t => t.priority === 'low').length || 0,
          },
          byCategory: tasks?.reduce((acc: any, task) => {
            if (task.category) {
              acc[task.category] = (acc[task.category] || 0) + 1
            }
            return acc
          }, {})
        }

        return NextResponse.json({ tasks, stats })
      }

      case 'time': {
        const { data: timeEntries, error } = await supabaseAdmin
          .from('time_entries')
          .select(`
            *,
            task:tasks!task_id(title, project:projects!project_id(name))
          `)
          .eq('workspace_id', workspaceId)
          .order('date', { ascending: false })

        if (error) throw error

        const totalDuration = timeEntries?.reduce((sum, e) => sum + (e.duration || 0), 0) || 0

        return NextResponse.json({ 
          timeEntries, 
          stats: { 
            totalDuration,
            totalHours: Math.round(totalDuration / 3600 * 10) / 10
          }
        })
      }

      case 'productivity': {
        // Get tasks with completion dates
        const { data: tasks } = await supabaseAdmin
          .from('tasks')
          .select('*')
          .eq('workspace_id', workspaceId)

        // Get time entries
        const { data: timeEntries } = await supabaseAdmin
          .from('time_entries')
          .select('*')
          .eq('workspace_id', workspaceId)

        // Calculate weekly stats
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (6 - i))
          return date.toISOString().split('T')[0]
        })

        const trendData = last7Days.map(date => {
          const completed = tasks?.filter(
            t => t.completed_at && t.completed_at.startsWith(date)
          ).length || 0
          const created = tasks?.filter(
            t => t.created_at && t.created_at.startsWith(date)
          ).length || 0
          const timeLogged = timeEntries?.filter(
            e => e.date === date
          ).reduce((sum, e) => sum + (e.duration || 0), 0) || 0

          return {
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            completed,
            created,
            timeLogged: Math.round(timeLogged / 3600 * 10) / 10
          }
        })

        return NextResponse.json({ trendData, tasks, timeEntries })
      }

      default: {
        // Return overview of all data
        const [tasks, timeEntries, projects] = await Promise.all([
          supabaseAdmin.from('tasks').select('*').eq('workspace_id', workspaceId),
          supabaseAdmin.from('time_entries').select('*').eq('workspace_id', workspaceId),
          supabaseAdmin.from('projects').select('*').eq('workspace_id', workspaceId)
        ])

        const totalDuration = timeEntries.data?.reduce((sum, e) => sum + (e.duration || 0), 0) || 0

        return NextResponse.json({
          stats: {
            totalTasks: tasks.data?.length || 0,
            completedTasks: tasks.data?.filter(t => t.is_completed).length || 0,
            activeTasks: tasks.data?.filter(t => !t.is_completed).length || 0,
            totalProjects: projects.data?.length || 0,
            totalTimeLogged: Math.round(totalDuration / 3600 * 10) / 10,
            completionRate: tasks.data?.length 
              ? Math.round((tasks.data.filter(t => t.is_completed).length / tasks.data.length) * 100)
              : 0
          },
          tasks: tasks.data,
          timeEntries: timeEntries.data,
          projects: projects.data
        })
      }
    }
  } catch (error: any) {
    console.error('Error in GET /api/reports:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
