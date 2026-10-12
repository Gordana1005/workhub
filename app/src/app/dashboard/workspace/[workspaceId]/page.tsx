import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import WorkspaceOverview from '@/components/workspace/WorkspaceOverview'

export default async function WorkspacePage({
  params
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check if user is a member of this workspace
  const { data: membership, error: memberError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    redirect('/dashboard')
  }

  // Get workspace details
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select(`
      *,
      workspace_members(count),
      profiles!workspaces_owner_id_fkey(username, avatar_url)
    `)
    .eq('id', workspaceId)
    .single()

  if (workspaceError) {
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