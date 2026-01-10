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

// GET /api/finance - Get finance data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspace_id')
    const type = searchParams.get('type') // accounts, transactions, categories, goals
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

    switch (type) {
      case 'accounts': {
        const { data, error } = await supabaseAdmin
          .from('finance_accounts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true)
        
        if (error) throw error
        return NextResponse.json({ accounts: data })
      }

      case 'transactions': {
        let query = supabaseAdmin
          .from('finance_transactions')
          .select('*, category:finance_categories(*)')
          .eq('workspace_id', workspaceId)
          .order('date', { ascending: false })

        if (startDate) query = query.gte('date', startDate)
        if (endDate) query = query.lte('date', endDate)

        const { data, error } = await query
        if (error) throw error
        return NextResponse.json({ transactions: data })
      }

      case 'categories': {
        const { data, error } = await supabaseAdmin
          .from('finance_categories')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('name')
        
        if (error) throw error
        return NextResponse.json({ categories: data })
      }

      case 'goals': {
        const { data, error } = await supabaseAdmin
          .from('finance_goals')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('target_date')
        
        if (error) throw error
        return NextResponse.json({ goals: data })
      }

      default: {
        // Return all finance data
        const [accounts, transactions, categories, goals] = await Promise.all([
          supabaseAdmin.from('finance_accounts').select('*').eq('workspace_id', workspaceId).eq('is_active', true),
          supabaseAdmin.from('finance_transactions').select('*, category:finance_categories(*)').eq('workspace_id', workspaceId).order('date', { ascending: false }).limit(50),
          supabaseAdmin.from('finance_categories').select('*').eq('workspace_id', workspaceId),
          supabaseAdmin.from('finance_goals').select('*').eq('workspace_id', workspaceId)
        ])

        return NextResponse.json({
          accounts: accounts.data || [],
          transactions: transactions.data || [],
          categories: categories.data || [],
          goals: goals.data || []
        })
      }
    }
  } catch (error: any) {
    console.error('Error in GET /api/finance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/finance - Create finance records
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, workspace_id, ...data } = body

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

    switch (type) {
      case 'account': {
        const { data: account, error } = await supabaseAdmin
          .from('finance_accounts')
          .insert({ ...data, workspace_id, created_by: user.id })
          .select()
          .single()
        
        if (error) throw error
        return NextResponse.json({ account }, { status: 201 })
      }

      case 'transaction': {
        const { data: transaction, error } = await supabaseAdmin
          .from('finance_transactions')
          .insert({ ...data, workspace_id, created_by: user.id })
          .select('*, category:finance_categories(*)')
          .single()
        
        if (error) throw error

        // Update account balance if account_id provided
        if (data.account_id && data.amount) {
          const adjustment = data.type === 'income' ? data.amount : -data.amount
          // Get current balance and update
          const { data: account } = await supabaseAdmin
            .from('finance_accounts')
            .select('current_balance')
            .eq('id', data.account_id)
            .single()
          
          if (account) {
            await supabaseAdmin
              .from('finance_accounts')
              .update({ current_balance: (account.current_balance || 0) + adjustment })
              .eq('id', data.account_id)
          }
        }

        return NextResponse.json({ transaction }, { status: 201 })
      }

      case 'category': {
        const { data: category, error } = await supabaseAdmin
          .from('finance_categories')
          .insert({ ...data, workspace_id })
          .select()
          .single()
        
        if (error) throw error
        return NextResponse.json({ category }, { status: 201 })
      }

      case 'goal': {
        const { data: goal, error } = await supabaseAdmin
          .from('finance_goals')
          .insert({ ...data, workspace_id, created_by: user.id })
          .select()
          .single()
        
        if (error) throw error
        return NextResponse.json({ goal }, { status: 201 })
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error in POST /api/finance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/finance - Update finance records
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    switch (type) {
      case 'account': {
        const { data, error } = await supabaseAdmin
          .from('finance_accounts')
          .update(updates)
          .eq('id', id)
          .select()
          .single()
        
        if (error) throw error
        return NextResponse.json({ account: data })
      }

      case 'transaction': {
        const { data, error } = await supabaseAdmin
          .from('finance_transactions')
          .update(updates)
          .eq('id', id)
          .select('*, category:finance_categories(*)')
          .single()
        
        if (error) throw error
        return NextResponse.json({ transaction: data })
      }

      case 'goal': {
        const { data: existing } = await supabaseAdmin
          .from('finance_goals')
          .select('*')
          .eq('id', id)
          .single()

        const { data, error } = await supabaseAdmin
          .from('finance_goals')
          .update(updates)
          .eq('id', id)
          .select()
          .single()
        
        if (error) throw error

        const statusNow = (data as any)?.status
        const statusBefore = (existing as any)?.status
        const workspaceId = (data as any)?.workspace_id

        if (workspaceId && statusBefore !== 'completed' && statusNow === 'completed') {
          const { data: members } = await supabaseAdmin
            .from('workspace_members')
            .select('user_id')
            .eq('workspace_id', workspaceId)

          const notifications = (members || []).map((m: any) => ({
            user_id: m.user_id,
            workspace_id: workspaceId,
            type: 'goal_completed',
            title: 'Goal completed',
            message: `${(data as any)?.name || (data as any)?.title || 'A goal'} was completed`,
            link: '/dashboard/finance'
          }))

          await notifyUsers(notifications)
        }

        return NextResponse.json({ goal: data })
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error in PATCH /api/finance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/finance - Delete finance records
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    switch (type) {
      case 'account': {
        const { error } = await supabaseAdmin
          .from('finance_accounts')
          .update({ is_active: false })
          .eq('id', id)
        
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case 'transaction': {
        const { error } = await supabaseAdmin
          .from('finance_transactions')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case 'goal': {
        const { error } = await supabaseAdmin
          .from('finance_goals')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error in DELETE /api/finance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
