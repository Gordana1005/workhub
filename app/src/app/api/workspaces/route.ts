import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { ServerTimer } from '@/lib/server-timing'
import { createSupabaseServer, getAuthUser } from '@/lib/supabase-server'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Service role client for bypassing RLS when needed
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function createNotifications(entries: Array<{ user_id: string; workspace_id: string; type: string; title: string; message: string; link?: string }>) {
  if (!entries.length) return
  await supabaseAdmin.from('notifications').insert(
    entries.map((n) => ({ ...n, read: false }))
  )
}

export async function GET() {
  try {
    const timer = new ServerTimer()
    const user = await timer.time('auth', getAuthUser())
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fast path: memberships + their workspaces + member counts in ONE query (embedded relations).
    // Falls back to the step-by-step lookup below if the embed is not available.
    const joined = await timer.time(
      'db',
      supabaseAdmin
        .from('workspace_members')
        .select('workspace_id, role, workspaces(*, workspace_members(count))')
        .eq('user_id', user.id)
        .limit(500)
    )
    if (!joined.error && Array.isArray(joined.data)) {
      const workspacesWithDetails = (joined.data as any[])
        .map((row) => {
          const workspace = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces
          if (!workspace) return null
          const { workspace_members: countRows, ...rest } = workspace
          const memberCount = Array.isArray(countRows) ? Number(countRows[0]?.count) || 0 : 0
          return { ...rest, userRole: row.role, memberCount }
        })
        .filter(Boolean)
      return timer.apply(NextResponse.json({ workspaces: workspacesWithDetails }))
    }

    // Get workspaces where user is a member (using service role to bypass RLS issues)
    const { data: membershipData, error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .limit(500)

    if (memberError) {
      console.error('Membership query error:', memberError)
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    if (!membershipData || membershipData.length === 0) {
      return NextResponse.json({ workspaces: [] })
    }

    const workspaceIds = membershipData.map(m => m.workspace_id)

    // Use service role to get workspaces (bypasses RLS); member counts are one batched query
    const [{ data: workspaces, error }, { data: allMembers }] = await Promise.all([
      supabaseAdmin
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds)
        .limit(500),
      supabaseAdmin
        .from('workspace_members')
        .select('workspace_id')
        .in('workspace_id', workspaceIds)
        .limit(20000),
    ])

    if (error) {
      console.error('Workspaces query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const memberCounts = new Map<string, number>()
    for (const m of allMembers || []) {
      memberCounts.set(m.workspace_id, (memberCounts.get(m.workspace_id) || 0) + 1)
    }

    const workspacesWithDetails = await Promise.all(
      (workspaces || []).map(async (workspace) => {
        const membership = membershipData.find(m => m.workspace_id === workspace.id)
        const memberCount = memberCounts.get(workspace.id) || 0

        return {
          ...workspace,
          userRole: membership?.role,
          memberCount: memberCount || 0
        }
      })
    )

    return timer.apply(NextResponse.json({ workspaces: workspacesWithDetails }))

  } catch (error) {
    // Log the full error to the server console for debugging
    console.error('API /api/workspaces error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServer()

    const user = await getAuthUser(supabase)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, category, color, description } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }

    // Create workspace using admin client to bypass RLS
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .insert({ 
        name: name.trim(), 
        owner_id: user.id,
        category: category || null,
        color: color || '#667eea',
        description: description || null
      })
      .select()
      .single()

    if (workspaceError) {
      console.error('Workspace creation error:', workspaceError)
      return NextResponse.json({ error: workspaceError.message }, { status: 500 })
    }

    // Add creator as admin member using admin client
    const { error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'admin'
      })

    if (memberError) {
      console.error('Member creation error:', memberError)
      // Clean up workspace if member creation fails
      await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
      return NextResponse.json({ error: 'Failed to create workspace membership' }, { status: 500 })
    }

    await createNotifications([
      {
        user_id: user.id,
        workspace_id: workspace.id,
        type: 'workspace_created',
        title: 'Workspace created',
        message: `You created ${workspace.name}. Invite your team to get started.`,
        link: '/dashboard/workspaces'
      }
    ])

    return NextResponse.json({ workspace })

  } catch (error) {
    console.error('POST /api/workspaces error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}