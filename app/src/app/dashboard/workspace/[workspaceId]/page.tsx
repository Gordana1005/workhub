import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
      profiles!workspaces_owner_id_fkey(full_name, avatar_url)
    `)
    .eq('id', workspaceId)
    .single()

  if (workspaceError) {
    redirect('/dashboard')
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          {workspace.name}
        </h1>
        <div className="flex items-center space-x-4 text-text-secondary">
          <span>Role: {membership.role}</span>
          <span>•</span>
          <span>{workspace.workspace_members?.[0]?.count || 0} members</span>
          <span>•</span>
          <span>Owner: {workspace.profiles?.full_name || 'Unknown'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-surface p-6 rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Projects</h3>
          <p className="text-3xl font-bold text-accent-blue">0</p>
          <p className="text-text-secondary">Active projects</p>
        </div>

        <div className="bg-surface p-6 rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Tasks</h3>
          <p className="text-3xl font-bold text-accent-purple">0</p>
          <p className="text-text-secondary">Total tasks</p>
        </div>

        <div className="bg-surface p-6 rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Time Tracked</h3>
          <p className="text-3xl font-bold text-accent-green">0h</p>
          <p className="text-text-secondary">This week</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="bg-surface p-4 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-dark-inset transition-all duration-200 text-left">
            <h3 className="font-semibold text-text-primary">Create Project</h3>
            <p className="text-text-secondary text-sm">Start a new project</p>
          </button>

          <button className="bg-surface p-4 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-dark-inset transition-all duration-200 text-left">
            <h3 className="font-semibold text-text-primary">Add Task</h3>
            <p className="text-text-secondary text-sm">Create a new task</p>
          </button>

          <button className="bg-surface p-4 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-dark-inset transition-all duration-200 text-left">
            <h3 className="font-semibold text-text-primary">Start Timer</h3>
            <p className="text-text-secondary text-sm">Track your time</p>
          </button>

          <button className="bg-surface p-4 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-dark-inset transition-all duration-200 text-left">
            <h3 className="font-semibold text-text-primary">View Reports</h3>
            <p className="text-text-secondary text-sm">Analytics & insights</p>
          </button>
        </div>
      </div>
    </div>
  )
}