import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Create Supabase client for authentication
async function createAuthClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
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
}

// GET /api/notifications - List notifications for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Build query using admin client
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by unread if requested
    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      // If table doesn't exist, return empty array instead of error
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return NextResponse.json({ notifications: [] })
      }
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notifications: notifications || [] })
  } catch (error) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications - Mark notification(s) as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const body = await request.json()
    const { id, ids, mark_all_read } = body

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Mark all as read
    if (mark_all_read) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) {
        console.error('Error marking all as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark all as read' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    // Mark multiple as read
    if (ids && Array.isArray(ids)) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .in('id', ids)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error marking notifications as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark notifications as read' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    // Mark single as read
    if (id) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error marking notification as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'id, ids, or mark_all_read is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in PATCH /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications - Delete notification(s)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const deleteAll = searchParams.get('delete_all') === 'true'

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete all read notifications
    if (deleteAll) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true)

      if (error) {
        console.error('Error deleting notifications:', error)
        return NextResponse.json(
          { error: 'Failed to delete notifications' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    // Delete single notification
    if (id) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting notification:', error)
        return NextResponse.json(
          { error: 'Failed to delete notification' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'id or delete_all is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in DELETE /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Create notification (for manual triggers)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAuthClient()
    const body = await request.json()

    const {
      user_id,
      workspace_id,
      type,
      title,
      message,
      link,
      related_task_id,
      related_project_id
    } = body

    // Validation
    if (!user_id || !workspace_id || !type || !title || !message) {
      return NextResponse.json(
        { error: 'user_id, workspace_id, type, title, and message are required' },
        { status: 400 }
      )
    }

    // Get current user for related_user_id
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create notification
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id,
        workspace_id,
        type,
        title,
        message,
        link,
        related_task_id,
        related_project_id,
        related_user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
