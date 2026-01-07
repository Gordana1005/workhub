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

// GET /api/time-entries
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
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

    let query = supabaseAdmin
      .from('time_entries')
      .select(`
        id, task_id, project_id, description, duration, date, created_at,
        task:tasks!task_id(title, project:projects!project_id(name))
      `)
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (date) {
      query = query.eq('date', date)
    } else if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    // Format the data
    const formattedData = data?.map((entry: any) => ({
      ...entry,
      task: entry.task ? (Array.isArray(entry.task) ? entry.task[0] : entry.task) : null
    })) || []

    return NextResponse.json({ timeEntries: formattedData })
  } catch (error: any) {
    console.error('Error in GET /api/time-entries:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/time-entries
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
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
