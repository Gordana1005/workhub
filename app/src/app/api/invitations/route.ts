import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {}
      }
    }
  )

  const body = await request.json()
  const { workspace_id, email } = body

  if (!workspace_id || !email) {
    return NextResponse.json(
      { error: 'workspace_id and email are required' },
      { status: 400 }
    )
  }

  try {
    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser()
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
        { error: 'Only admins can send invitations' },
        { status: 403 }
      )
    }

    // Check if invitation already exists
    const { data: existing } = await supabaseAdmin
      .from('invitations')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 400 }
      )
    }

    // Create invitation
    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .insert({
        workspace_id,
        email,
        invited_by: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    // In production, you would send an email here
    // For now, we'll just create the invitation record

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {}
      }
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspace_id = searchParams.get('workspace_id')

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  try {
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

    const { data: invitations, error } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ invitations: invitations || [] })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}