import { supabase } from './supabase'

export async function createWorkspace(name: string, description?: string) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    // Create workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name,
        description: description || '',
        owner_id: user.id
      })
      .select()
      .single()

    if (workspaceError) {
      console.error('Workspace creation error:', workspaceError)
      throw workspaceError
    }

    // Create workspace member entry for owner
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner'
      })

    if (memberError) {
      console.error('Member creation error:', memberError)
      // Rollback workspace creation
      await supabase.from('workspaces').delete().eq('id', workspace.id)
      throw memberError
    }

    return workspace
  } catch (error) {
    console.error('Error creating workspace:', error)
    throw error
  }
}

export async function getWorkspaces() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        workspace:workspaces(*)
      `)
      .eq('user_id', user.id)

    if (error) throw error

    return data?.map(item => item.workspace).filter(Boolean) || []
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    throw error
  }
}
