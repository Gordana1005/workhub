import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Service role client for bypassing RLS when needed
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspaces where user is a member (using service role to bypass RLS issues)
    const { data: membershipData, error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Membership query error:', memberError)
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    if (!membershipData || membershipData.length === 0) {
      return NextResponse.json({ workspaces: [] })
    }

    const workspaceIds = membershipData.map(m => m.workspace_id)

    // Use service role to get workspaces (bypasses RLS)
    const { data: workspaces, error } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .in('id', workspaceIds)

    if (error) {
      console.error('Workspaces query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get member counts for each workspace
    const workspacesWithDetails = await Promise.all(
      (workspaces || []).map(async (workspace) => {
        const membership = membershipData.find(m => m.workspace_id === workspace.id)
        
        const { count: memberCount } = await supabaseAdmin
          .from('workspace_members')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id)

        return {
          ...workspace,
          userRole: membership?.role,
          memberCount: memberCount || 0
        }
      })
    )

    return NextResponse.json({ workspaces: workspacesWithDetails })

  } catch (error) {
    // Log the full error to the server console for debugging
    console.error('API /api/workspaces error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
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

    return NextResponse.json({ workspace })

  } catch (error) {
    console.error('POST /api/workspaces error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}