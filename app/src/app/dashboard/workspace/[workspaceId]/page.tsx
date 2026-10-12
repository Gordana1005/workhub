import { redirect } from 'next/navigation'
import { createSupabaseServer, getAuthUser } from '@/lib/supabase-server'
import WorkspaceOverview from '@/components/workspace/WorkspaceOverview'

export default async function WorkspacePage({
  params
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const supabase = createSupabaseServer()
  const user = await getAuthUser(supabase)

  if (!user) {
    redirect('/auth/login')
  }

  // Membership check and workspace details are independent: fetch both at once
  const [membershipResult, workspaceResult] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('workspaces')
      .select(`
        *,
        workspace_members(count),
        profiles!workspaces_owner_id_fkey(username, avatar_url)
      `)
      .eq('id', workspaceId)
      .single(),
  ])
  const { data: membership, error: memberError } = membershipResult
  const { data: workspace, error: workspaceError } = workspaceResult

  if (memberError || !membership) {
    redirect('/dashboard')
  }

  if (workspaceError || !workspace) {
    redirect('/dashboard')
  }

  return (
    <WorkspaceOverview
      id={workspaceId}
      name={workspace.name}
      role={membership.role}
      members={workspace.workspace_members?.[0]?.count || 0}
      owner={workspace.profiles?.username || ''}
      color={workspace.color ?? null}
      category={workspace.category ?? null}
      description={workspace.description ?? null}
    />
  )
}