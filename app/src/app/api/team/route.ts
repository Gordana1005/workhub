import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createSupabaseServer, getAuthUser } from '@/lib/supabase-server'
import { createNotification } from '@/lib/notify'
import { runTopLevel } from '@/lib/subtasks'
import { ServerTimer } from '@/lib/server-timing'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_ROLES = ['admin', 'member']

async function isWorkspaceOwner(workspaceId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .maybeSingle()
  return data?.owner_id === userId
}

export async function GET(request: Request) {
  const timer = new ServerTimer()
  const user = await timer.time('auth', getAuthUser())
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspace_id = searchParams.get('workspace_id')

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  try {
    // Membership check, the member list, projects, open tasks, workspace owner and project-member rows
    // are independent: ONE round trip (project members are scoped through an inner join on projects).
    const [
      { data: membership },
      { data: members, error },
      { data: projectRows },
      { data: openTasks },
      { data: workspace },
      projectMembersResult,
    ] = await timer.time(
      'db',
      Promise.all([
        // Verify user is member of workspace
        supabaseAdmin
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspace_id)
          .eq('user_id', user.id)
          .single(),
        supabaseAdmin
          .from('workspace_members')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              avatar_url,
              email
            )
          `)
          .eq('workspace_id', workspace_id)
          .limit(1000),
        // Per-member workload (additive): projects they belong to / created and their open + overdue tasks
        supabaseAdmin.from('projects').select('id, creator_id').eq('workspace_id', workspace_id),
        // top-level tasks only: subtasks do not count towards a member's workload
        runTopLevel((topLevel) => {
          let q = supabaseAdmin
            .from('tasks')
            .select('assignee_id, due_date')
            .eq('workspace_id', workspace_id)
            .eq('is_completed', false)
            .not('assignee_id', 'is', null)
            .limit(5000)
          if (topLevel) q = q.is('parent_task_id', null)
          return q
        }),
        supabaseAdmin.from('workspaces').select('owner_id').eq('id', workspace_id).maybeSingle(),
        supabaseAdmin
          .from('project_members')
          .select('project_id, user_id, projects!inner(workspace_id)')
          .eq('projects.workspace_id', workspace_id),
      ])
    )

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (error) throw error

    let projectMemberRows: any[] = projectMembersResult.data || []
    if (projectMembersResult.error) {
      // join not available (schema drift): fall back to the id-list query
      const projectIds = (projectRows || []).map((p: any) => p.id)
      const fallback = projectIds.length
        ? await supabaseAdmin.from('project_members').select('project_id, user_id').in('project_id', projectIds)
        : { data: [] as any[] }
      projectMemberRows = fallback.data || []
    }

    const projectsByUser = new Map<string, Set<string>>()
    const addProject = (userId: string, projectId: string) => {
      const set = projectsByUser.get(userId) || new Set<string>()
      set.add(projectId)
      projectsByUser.set(userId, set)
    }
    for (const row of projectMemberRows || []) addProject(row.user_id, row.project_id)
    for (const row of projectRows || []) if (row.creator_id) addProject(row.creator_id, row.id)

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const openByUser = new Map<string, { open: number; overdue: number }>()
    for (const task of openTasks || []) {
      const entry = openByUser.get(task.assignee_id) || { open: 0, overdue: 0 }
      entry.open += 1
      if (task.due_date && new Date(task.due_date).getTime() < startOfToday.getTime()) entry.overdue += 1
      openByUser.set(task.assignee_id, entry)
    }

    const membersWithStats = (members || []).map((member: any) => ({
      ...member,
      stats: {
        projects: projectsByUser.get(member.user_id)?.size || 0,
        open_tasks: openByUser.get(member.user_id)?.open || 0,
        overdue_tasks: openByUser.get(member.user_id)?.overdue || 0,
      },
    }))

    return timer.apply(NextResponse.json({
      members: membersWithStats,
      viewer_id: user.id,
      viewer_role: membership.role,
      owner_id: workspace?.owner_id ?? null,
    }))
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {


  const { searchParams } = new URL(request.url)
  const workspace_id = searchParams.get('workspace_id')
  const user_id = searchParams.get('user_id')

  if (!workspace_id || !user_id) {
    return NextResponse.json(
      { error: 'workspace_id and user_id are required' },
      { status: 400 }
    )
  }

  try {
    // Check if current user is admin
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentMember } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (currentMember?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can remove members' },
        { status: 403 }
      )
    }

    // The workspace owner can never be removed
    if (await isWorkspaceOwner(workspace_id, user_id)) {
      return NextResponse.json(
        { error: 'The workspace owner cannot be removed' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspace_id)
      .eq('user_id', user_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {


  const { searchParams } = new URL(request.url)
  const workspace_id = searchParams.get('workspace_id')
  const user_id = searchParams.get('user_id')
  
  const body = await request.json().catch(() => ({}))
  const { role } = body

  if (!workspace_id || !user_id || !role) {
    return NextResponse.json(
      { error: 'workspace_id, user_id, and role are required' },
      { status: 400 }
    )
  }

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'role must be admin or member' }, { status: 400 })
  }

  try {
    // Check if current user is admin
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentMember } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (currentMember?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can change roles' },
        { status: 403 }
      )
    }

    // The workspace owner always stays an admin
    if (role !== 'admin' && await isWorkspaceOwner(workspace_id, user_id)) {
      return NextResponse.json(
        { error: 'The workspace owner must remain an admin' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspace_id)
      .eq('user_id', user_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating member role:', error)
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const supabase = createSupabaseServer()

  const user = await getAuthUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { workspace_id, username, role = 'member' } = body

  if (!workspace_id || !username) {
    return NextResponse.json({ error: 'workspace_id and username are required' }, { status: 400 })
  }

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'role must be admin or member' }, { status: 400 })
  }

  try {
    // Ensure requester is admin
    const { data: currentMember } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (currentMember?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can add members' }, { status: 403 })
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (targetError || !target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: existing } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('user_id', target.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'User already in workspace' }, { status: 400 })
    }

    const { error: insertError } = await supabaseAdmin
      .from('workspace_members')
      .insert({ workspace_id, user_id: target.id, role })

    if (insertError) throw insertError

    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('name')
      .eq('id', workspace_id)
      .single()

    await createNotification({
      user_id: target.id,
      workspace_id,
      type: 'workspace_member_added',
      title: 'Added to workspace',
      message: `You were added to ${workspace?.name || 'a workspace'}.`,
      link: '/dashboard'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding member by username:', error)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}