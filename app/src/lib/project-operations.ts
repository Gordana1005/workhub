import { supabase } from './supabase'

export async function createProject(
  workspaceId: string,
  name: string,
  description?: string
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    // Verify user is member of workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      throw new Error('User is not a member of this workspace')
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        name,
        description: description || '',
        creator_id: user.id,
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error
    return project
  } catch (error) {
    console.error('Error creating project:', error)
    throw error
  }
}

export async function getProjects(workspaceId: string) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching projects:', error)
    throw error
  }
}
