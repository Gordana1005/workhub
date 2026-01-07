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

// GET /api/plans
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspace_id')
    const planId = searchParams.get('id')

    if (!workspaceId && !planId) {
      return NextResponse.json({ error: 'workspace_id or id is required' }, { status: 400 })
    }

    // Fetch single plan with milestones
    if (planId) {
      const { data: plan, error } = await supabaseAdmin
        .from('plans')
        .select(`
          *,
          milestones:plan_milestones(*)
        `)
        .eq('id', planId)
        .single()

      if (error) throw error
      return NextResponse.json({ plan })
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

    const { data: plans, error } = await supabaseAdmin
      .from('plans')
      .select(`
        *,
        milestones:plan_milestones(id, is_completed)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate progress for each plan
    const plansWithProgress = plans?.map(p => ({
      ...p,
      totalMilestones: p.milestones?.length || 0,
      completedMilestones: p.milestones?.filter((m: any) => m.is_completed).length || 0,
      progress: p.milestones?.length 
        ? Math.round((p.milestones.filter((m: any) => m.is_completed).length / p.milestones.length) * 100)
        : 0
    }))

    return NextResponse.json({ plans: plansWithProgress })
  } catch (error: any) {
    console.error('Error in GET /api/plans:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/plans
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspace_id, name, description, start_date, end_date, color } = body

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

    const { data: plan, error } = await supabaseAdmin
      .from('plans')
      .insert({
        workspace_id,
        name,
        description,
        start_date,
        end_date,
        color,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/plans:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/plans
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

    const { data: plan, error } = await supabaseAdmin
      .from('plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ plan })
  } catch (error: any) {
    console.error('Error in PATCH /api/plans:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/plans
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

    // Delete milestones first
    await supabaseAdmin.from('plan_milestones').delete().eq('plan_id', id)

    // Delete plan
    const { error } = await supabaseAdmin
      .from('plans')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/plans:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
