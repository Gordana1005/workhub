import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { getRowWorkspaceId, getWorkspaceRole, omitKeys, withMembership } from '@/lib/api-access'
import { ServerTimer } from '@/lib/server-timing'
import {
  balanceChanges,
  isMissingRpcError,
  isTransactionType,
  parsePositiveAmount,
} from '@/lib/finance-balance'

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

// --- Account balances -------------------------------------------------------
// Balances are owned by the DB trigger `account_balance_trigger` (migration
// 011, hardened by 022): it is atomic and also covers the browser inserts done
// by QuickAdd / Import. The API must only adjust balances itself when that
// trigger does NOT exist, otherwise every change would be counted twice.
let dbOwnsBalancesCache: { value: boolean; at: number } | null = null
const DB_OWNS_TTL_MS = 5 * 60 * 1000

/**
 * Probes the DB with a throw-away inactive account: inserts a 1.00 income
 * transaction and checks whether the balance moved by itself.
 * Returns null when the probe could not run.
 */
async function probeBalanceTrigger(workspaceId: string): Promise<boolean | null> {
  const { data: probe, error } = await supabaseAdmin
    .from('finance_accounts')
    .insert({
      workspace_id: workspaceId,
      name: '__balance_probe__',
      type: 'cash',
      initial_balance: 0,
      current_balance: 0,
      is_active: false,
    })
    .select('id')
    .single()
  if (error || !probe) return null

  try {
    const { error: txError } = await supabaseAdmin.from('finance_transactions').insert({
      workspace_id: workspaceId,
      account_id: probe.id,
      type: 'income',
      amount: 1,
      description: '__balance_probe__',
      date: new Date().toISOString().slice(0, 10),
    })
    if (txError) return null
    const { data: after } = await supabaseAdmin
      .from('finance_accounts')
      .select('current_balance')
      .eq('id', probe.id)
      .single()
    return Number(after?.current_balance) === 1
  } finally {
    // Cascades to the probe transaction
    await supabaseAdmin.from('finance_accounts').delete().eq('id', probe.id)
  }
}

/** True when the DB trigger already maintains balances (so the API must not). */
async function dbOwnsBalances(workspaceId: string): Promise<boolean> {
  if (dbOwnsBalancesCache && Date.now() - dbOwnsBalancesCache.at < DB_OWNS_TTL_MS) {
    return dbOwnsBalancesCache.value
  }
  const remember = (value: boolean) => {
    dbOwnsBalancesCache = { value, at: Date.now() }
    return value
  }

  const { data, error } = await supabaseAdmin.rpc('finance_balance_trigger_active')
  if (!error && typeof data === 'boolean') return remember(data)

  if (isMissingRpcError(error)) {
    // Migration 022 not applied yet: detect the trigger empirically
    try {
      const probed = await probeBalanceTrigger(workspaceId)
      if (probed !== null) return remember(probed)
    } catch (probeError) {
      console.error('Balance trigger probe failed:', probeError)
    }
  }
  // Unknown: assume the trigger exists (never risk double counting), retry next time
  return true
}

/** Atomic `balance = balance + delta`; falls back to read-modify-write if the RPC is missing. */
async function applyBalanceDelta(accountId: string, delta: number) {
  if (!accountId || !Number.isFinite(delta) || delta === 0) return
  const { error } = await supabaseAdmin.rpc('adjust_account_balance', {
    p_account_id: accountId,
    p_delta: delta,
  })
  if (!error) return
  if (!isMissingRpcError(error)) throw error

  const { data: account, error: readError } = await supabaseAdmin
    .from('finance_accounts')
    .select('current_balance')
    .eq('id', accountId)
    .single()
  if (readError) throw readError
  const { error: writeError } = await supabaseAdmin
    .from('finance_accounts')
    .update({ current_balance: (Number(account?.current_balance) || 0) + delta })
    .eq('id', accountId)
  if (writeError) throw writeError
}

async function applyBalanceChanges(changes: Record<string, number>) {
  for (const [accountId, delta] of Object.entries(changes)) {
    await applyBalanceDelta(accountId, delta)
  }
}

const FINANCE_TABLES: Record<string, string> = {
  account: 'finance_accounts',
  transaction: 'finance_transactions',
  goal: 'finance_goals',
}

// Verifies the record exists and the caller belongs to its workspace.
// Returns an error response, or null when access is allowed.
async function authorizeRecord(type: string | null | undefined, id: string, userId: string) {
  const table = type ? FINANCE_TABLES[type] : undefined
  if (!table) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  const workspaceId = await getRowWorkspaceId(supabaseAdmin, table, id)
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!(await getWorkspaceRole(supabaseAdmin, workspaceId, userId))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  return null
}

// GET /api/finance - Get finance data
export async function GET(request: NextRequest) {
  try {
    const timer = new ServerTimer()
    const user = await timer.time('auth', getAuthUser())
    if (!user) {
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

    // Verify workspace access while the data query runs (independent: one round trip, not two)
    const gate = await timer.time('db', withMembership(supabaseAdmin, workspaceId, user.id, async () => {
      switch (type) {
        case 'accounts': {
          const { data, error } = await supabaseAdmin
            .from('finance_accounts')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('is_active', true)
            .limit(500)
          
          if (error) throw error
          return ({ accounts: data })
        }

        case 'transactions': {
          let query = supabaseAdmin
            .from('finance_transactions')
            .select('*, category:finance_categories(*)')
            .eq('workspace_id', workspaceId)
            .order('date', { ascending: false })
            .limit(2000)

          if (startDate) query = query.gte('date', startDate)
          if (endDate) query = query.lte('date', endDate)

          const { data, error } = await query
          if (error) throw error
          return ({ transactions: data })
        }

        case 'categories': {
          const { data, error } = await supabaseAdmin
            .from('finance_categories')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('name')
            .limit(1000)
          
          if (error) throw error
          return ({ categories: data })
        }

        case 'goals': {
          const { data, error } = await supabaseAdmin
            .from('finance_goals')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('target_date')
            .limit(500)
          
          if (error) throw error
          return ({ goals: data })
        }

        default: {
          // Return all finance data
          const [accounts, transactions, categories, goals] = await Promise.all([
            supabaseAdmin.from('finance_accounts').select('*').eq('workspace_id', workspaceId).eq('is_active', true).limit(500),
            supabaseAdmin.from('finance_transactions').select('*, category:finance_categories(*)').eq('workspace_id', workspaceId).order('date', { ascending: false }).limit(50),
            supabaseAdmin.from('finance_categories').select('*').eq('workspace_id', workspaceId).limit(1000),
            supabaseAdmin.from('finance_goals').select('*').eq('workspace_id', workspaceId).limit(500)
          ])

          return ({
            accounts: accounts.data || [],
            transactions: transactions.data || [],
            categories: categories.data || [],
            goals: goals.data || []
          })
        }
      }
    }))

    if (!gate.ok) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    return timer.apply(NextResponse.json(gate.value))
  } catch (error: any) {
    console.error('Error in GET /api/finance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/finance - Create finance records
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
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
        // The account (and category) must belong to the same workspace
        if (data.account_id) {
          const accountWs = await getRowWorkspaceId(supabaseAdmin, 'finance_accounts', data.account_id)
          if (accountWs !== workspace_id) {
            return NextResponse.json({ error: 'account_id does not belong to this workspace' }, { status: 400 })
          }
        }
        if (data.category_id) {
          // (categories may be global defaults with a null workspace_id)
          const { data: category } = await supabaseAdmin
            .from('finance_categories')
            .select('workspace_id')
            .eq('id', data.category_id)
            .maybeSingle()
          if (!category || (category.workspace_id !== null && category.workspace_id !== workspace_id)) {
            return NextResponse.json({ error: 'category_id does not belong to this workspace' }, { status: 400 })
          }
        }

        const amount = parsePositiveAmount(data.amount)
        if (amount === null) {
          return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
        }
        if (!isTransactionType(data.type)) {
          return NextResponse.json({ error: 'type must be income, expense or transfer' }, { status: 400 })
        }

        const { data: transaction, error } = await supabaseAdmin
          .from('finance_transactions')
          .insert({ ...data, amount, workspace_id, created_by: user.id })
          .select('*, category:finance_categories(*)')
          .single()

        if (error) throw error

        // Keep the balance in step (only when the DB trigger is not doing it)
        if (!(await dbOwnsBalances(workspace_id))) {
          try {
            await applyBalanceChanges(balanceChanges(null, transaction))
          } catch (balanceError) {
            // Don't leave a transaction without its balance effect
            await supabaseAdmin.from('finance_transactions').delete().eq('id', transaction.id)
            throw balanceError
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
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, id, ...rawUpdates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const denied = await authorizeRecord(type, id, user.id)
    if (denied) return denied

    // Rows can never be moved to another workspace or re-attributed
    const updates = omitKeys(rawUpdates, ['workspace_id', 'created_by', 'created_at'])

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
        const { data: before } = await supabaseAdmin
          .from('finance_transactions')
          .select('workspace_id, account_id, type, amount')
          .eq('id', id)
          .single()

        const txUpdates: Record<string, any> = { ...updates }
        if ('amount' in txUpdates) {
          const amount = parsePositiveAmount(txUpdates.amount)
          if (amount === null) {
            return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
          }
          txUpdates.amount = amount
        }
        if ('type' in txUpdates && !isTransactionType(txUpdates.type)) {
          return NextResponse.json({ error: 'type must be income, expense or transfer' }, { status: 400 })
        }
        if (txUpdates.account_id && txUpdates.account_id !== before?.account_id) {
          const accountWs = await getRowWorkspaceId(supabaseAdmin, 'finance_accounts', txUpdates.account_id)
          if (accountWs !== before?.workspace_id) {
            return NextResponse.json({ error: 'account_id does not belong to this workspace' }, { status: 400 })
          }
        }

        const { data, error } = await supabaseAdmin
          .from('finance_transactions')
          .update(txUpdates)
          .eq('id', id)
          .select('*, category:finance_categories(*)')
          .single()

        if (error) throw error

        // Reverse the old effect and apply the new one (account / type / amount edits)
        if (before && !(await dbOwnsBalances(before.workspace_id))) {
          try {
            await applyBalanceChanges(balanceChanges(before, data))
          } catch (balanceError) {
            // Restore the row so row and balance stay consistent
            await supabaseAdmin
              .from('finance_transactions')
              .update({ account_id: before.account_id, type: before.type, amount: before.amount })
              .eq('id', id)
            throw balanceError
          }
        }
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
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const denied = await authorizeRecord(type, id, user.id)
    if (denied) return denied

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
        const { data: existing } = await supabaseAdmin
          .from('finance_transactions')
          .select('workspace_id, account_id, type, amount')
          .eq('id', id)
          .single()

        const { error } = await supabaseAdmin
          .from('finance_transactions')
          .delete()
          .eq('id', id)

        if (error) throw error

        // Reverse the balance effect (only when the DB trigger is not doing it)
        if (existing && !(await dbOwnsBalances(existing.workspace_id))) {
          await applyBalanceChanges(balanceChanges(existing, null))
        }
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
