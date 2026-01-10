import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

function generateToken() {
  return crypto.randomUUID()
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // Authenticate and verify admin status using the guard
    const auth = await requireAdmin(request)
    
    // logic to handle unauthorized
    if (auth instanceof NextResponse) {
      return auth
    }

    const { user, workspaceId } = auth
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if invitation already exists
    const { data: existing } = await supabaseAdmin
      .from('invitations')
      .select('id')
      .eq('workspace_id', workspaceId)
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
    const token = generateToken()

    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .insert({
        workspace_id: workspaceId,
        email,
        token,
        role: 'member'
      })
      .select()
      .single()

    if (error) {
      console.error('Database Error:', error)
      return NextResponse.json(
        { error: error.message || 'Database error' },
        { status: 500 }
      )
    }

    // Since we don't have an email provider configured yet (like Resend or SendGrid),
    // we will return the join link so the admin can copy-paste it manually.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const joinLink = `${baseUrl}/join?token=${invitation.token}`

    // Log for debugging
    console.log(`[INVITE] Created invite for ${email}: ${joinLink}`)

    return NextResponse.json({ 
      invitation,
      message: 'Invitation created successfully',
      joinLink // Return this to the UI to display
    })

  } catch (error) {
    console.error('Error in invitation route:', error)
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