import { NextRequest, NextResponse } from 'next/server'
import { ServerTimer } from '@/lib/server-timing'
import { getAuthUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// A task / project referenced by a time entry must belong to the same workspace
async function validateLinks(workspaceId: string, taskId?: string | null, projectId?: string | null) {
  if (taskId) {
    const { data } = await supabaseAdmin
      .from('tasks').select('id').eq('id', taskId).eq('workspace_id', workspaceId).maybeSingle()
    if (!data) return 'task_id does not belong to this workspace'
  }
  if (projectId) {
    const { data } = await supabaseAdmin
      .from('projects').select('id').eq('id', projectId).eq('workspace_id', workspaceId).maybeSingle()
    if (!data) return 'project_id does not belong to this workspace'
  }
  return null
}

// GET /api/time-entries
export async function GET(request: NextRequest) {
  try {
    const timer = new ServerTimer()
    const user = await timer.time('auth', getAuthUser())
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspace_id')
    const date = searchParams.get('date')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }

    // Verify workspace access. The membership check is started now and awaited together with the
    // data queries (they are independent); nothing is returned unless it passes.
    const membershipPromise = Promise.resolve(
      supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single()
    )
    const denied = async () => {
      const { data: membership } = await membershipPromise
      return membership ? null : NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // ?task_id=<id>: everyone's entries for one task (the task detail "Time" section) + the total
    const taskId = searchParams.get('task_id')
    if (taskId) {
      const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 50))
      const [deniedResponse, { data: taskRow }, { data: rows, error: rowsError }] = await timer.time(
        'db',
        Promise.all([
          denied(),
          supabaseAdmin
            .from('tasks').select('id').eq('id', taskId).eq('workspace_id', workspaceId).maybeSingle(),
          supabaseAdmin
            .from('time_entries')
            .select('id, task_id, project_id, user_id, description, duration, date, created_at')
            .eq('workspace_id', workspaceId)
            .eq('task_id', taskId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1000),
        ])
      )
      if (deniedResponse) return deniedResponse
      if (!taskRow) {
        return NextResponse.json({ error: 'Task not found in this workspace' }, { status: 404 })
      }
      if (rowsError) throw rowsError

      const all = rows || []
      const totalSeconds = all.reduce((sum: number, row: any) => sum + (Number(row.duration) || 0), 0)
      const recent = all.slice(0, limit)
      const userIds = Array.from(new Set(recent.map((row: any) => row.user_id).filter(Boolean)))
      const { data: profiles } = userIds.length
        ? await timer.time('db2', supabaseAdmin.from('profiles').select('id, username, avatar_url').in('id', userIds))
        : { data: [] as any[] }
      const byId = new Map((profiles || []).map((p: any) => [p.id, p]))

      return timer.apply(NextResponse.json({
        timeEntries: recent.map((row: any) => ({
          ...row,
          user: byId.get(row.user_id)
            ? { id: row.user_id, username: (byId.get(row.user_id) as any).username ?? '', avatar_url: (byId.get(row.user_id) as any).avatar_url ?? null }
            : { id: row.user_id, username: '', avatar_url: null },
        })),
        totalSeconds,
        totalCount: all.length,
      }))
    }

    let query = supabaseAdmin
      .from('time_entries')
      .select(`
        id, task_id, project_id, description, duration, date, created_at,
        task:tasks!task_id(title, project:projects!project_id(name))
      `)
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5000)

    if (date) {
      query = query.eq('date', date)
    } else if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }

    const [{ data, error }, deniedResponse] = await timer.time('db', Promise.all([query, denied()]))
    if (deniedResponse) return deniedResponse

    if (error) throw error

    // Format the data
    const formattedData = data?.map((entry: any) => ({
      ...entry,
      task: entry.task ? (Array.isArray(entry.task) ? entry.task[0] : entry.task) : null
    })) || []

    return timer.apply(NextResponse.json({ timeEntries: formattedData }))
  } catch (error: any) {
    console.error('Error in GET /api/time-entries:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/time-entries
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspace_id, task_id, project_id, description, duration, date } = body

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
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

    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
      return NextResponse.json({ error: 'duration must be a non-negative number of seconds' }, { status: 400 })
    }

    const linkError = await validateLinks(workspace_id, task_id, project_id)
    if (linkError) {
      return NextResponse.json({ error: linkError }, { status: 400 })
    }

    const { data: timeEntry, error } = await supabaseAdmin
      .from('time_entries')
      .insert({
        workspace_id,
        user_id: user.id,
        task_id,
        project_id,
        description,
        duration,
        date: date || new Date().toISOString().split('T')[0]
      })
      .select(`
        id, task_id, project_id, description, duration, date,
        task:tasks!task_id(title, project:projects!project_id(name))
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ timeEntry }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/time-entries:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/time-entries
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Whitelist editable fields (never user_id / workspace_id)
    const updates: Record<string, any> = {}
    for (const key of ['task_id', 'project_id', 'description', 'duration', 'date']) {
      if (body[key] !== undefined) updates[key] = body[key]
    }
    if (updates.duration !== undefined &&
        (typeof updates.duration !== 'number' || !Number.isFinite(updates.duration) || updates.duration < 0)) {
      return NextResponse.json({ error: 'duration must be a non-negative number of seconds' }, { status: 400 })
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    if (updates.task_id || updates.project_id) {
      const { data: existing } = await supabaseAdmin
        .from('time_entries')
        .select('workspace_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!existing) {
        return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
      }
      const linkError = await validateLinks(existing.workspace_id, updates.task_id, updates.project_id)
      if (linkError) {
        return NextResponse.json({ error: linkError }, { status: 400 })
      }
    }

    const { data: timeEntry, error } = await supabaseAdmin
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ timeEntry })
  } catch (error: any) {
    console.error('Error in PATCH /api/time-entries:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/time-entries
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('time_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/time-entries:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
