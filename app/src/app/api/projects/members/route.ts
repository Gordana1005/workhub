import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notify'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Admin client for bypassing RLS (access is checked manually below)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Guard =
  | { ok: true; userId: string; workspaceId: string; role: string | null }
  | { ok: false; response: NextResponse }

// Authenticates the caller and verifies they belong to the project's workspace
async function guardProject(projectId: string | null, requireAdmin = false): Promise<Guard> {
  const user = await getAuthUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!projectId) {
    return { ok: false, response: NextResponse.json({ error: 'project_id is required' }, { status: 400 }) }
  }

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return { ok: false, response: NextResponse.json({ error: 'Project not found' }, { status: 404 }) }
  }

  const { data: membership } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { ok: false, response: NextResponse.json({ error: 'Access denied' }, { status: 403 }) }
  }

  // Managing project members is limited to workspace admins (matches the project_members RLS policy)
  if (requireAdmin && membership.role !== 'admin') {
    return { ok: false, response: NextResponse.json({ error: 'Only workspace admins can manage project members' }, { status: 403 }) }
  }

  return { ok: true, userId: user.id, workspaceId: project.workspace_id, role: membership.role ?? null }
}

// GET /api/projects/members?project_id=...
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('project_id')
    const guard = await guardProject(projectId)
    if (!guard.ok) return guard.response

    const { data: rows, error } = await supabaseAdmin
      .from('project_members')
      .select('user_id, role, added_at')
      .eq('project_id', projectId!)
      .order('added_at', { ascending: true })
      .limit(1000)

    if (error) throw error

    const userIds = (rows || []).map((r: any) => r.user_id)
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, username, avatar_url').in('id', userIds)
      : { data: [] as any[] }
    const byId = new Map((profiles || []).map((p: any) => [p.id, p]))

    const members = (rows || []).map((r: any) => {
      const profile: any = byId.get(r.user_id)
      return {
        id: r.user_id,
        username: profile?.username ?? '',
        avatar_url: profile?.avatar_url ?? null,
        role: r.role || 'member',
      }
    })

    // viewer_role lets the UI hide admin-only controls (the API enforces the same rule)
    return NextResponse.json({ members, viewer_role: guard.role, viewer_id: guard.userId })
  } catch (error: any) {
    console.error('Error in GET /api/projects/members:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/projects/members  { project_id, user_id, role? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, user_id, role } = body

    const guard = await guardProject(project_id || null, true)
    if (!guard.ok) return guard.response

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // The person being added must belong to the same workspace
    const { data: target } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', guard.workspaceId)
      .eq('user_id', user_id)
      .single()

    if (!target) {
      return NextResponse.json({ error: 'User is not a member of this workspace' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('project_members')
      .insert({
        project_id,
        user_id,
        role: role === 'admin' ? 'admin' : 'member',
      })

    // 23505 = already a member, treat as success
    if (error && error.code !== '23505') throw error

    // Tell the person who was added (not when they added themselves or were already a member)
    if (!error && user_id !== guard.userId) {
      const { data: project } = await supabaseAdmin.from('projects').select('name').eq('id', project_id).maybeSingle()
      await createNotification({
        user_id,
        workspace_id: guard.workspaceId,
        type: 'project_member_added',
        title: 'Added to a project',
        message: `You were added to ${project?.name || 'a project'}.`,
        link: `/dashboard/projects/${project_id}`
      })
    }

    return NextResponse.json({ success: true }, { status: error ? 200 : 201 })
  } catch (error: any) {
    console.error('Error in POST /api/projects/members:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/projects/members?project_id=...&user_id=...
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const userId = searchParams.get('user_id')

    const guard = await guardProject(projectId, true)
    if (!guard.ok) return guard.response

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('project_members')
      .delete()
      .eq('project_id', projectId!)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/projects/members:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
