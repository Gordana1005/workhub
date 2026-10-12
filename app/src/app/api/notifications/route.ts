import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { getWorkspaceRole } from '@/lib/api-access'
import { sendPushToUser } from '@/lib/push'
import { ServerTimer } from '@/lib/server-timing'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/notifications - List notifications for current user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const parsedLimit = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50

    // Get current user
    const timer = new ServerTimer()
    const user = await timer.time('auth', getAuthUser())
    if (!user) {
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

    const { data: notifications, error } = await timer.time('db', query)

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

    return timer.apply(NextResponse.json({ notifications: notifications || [] }))
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
    const body = await request.json()
    const { id, ids, mark_all_read } = body

    // Get current user
    const user = await getAuthUser()
    if (!user) {
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
    if (ids && Array.isArray(ids) && ids.length > 0) {
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
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const deleteAll = searchParams.get('delete_all') === 'true'

    // Get current user
    const user = await getAuthUser()
    if (!user) {
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
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Sender and recipient must both belong to the workspace (no cross-workspace spoofing)
    const [senderRole, recipientRole] = await Promise.all([
      getWorkspaceRole(supabaseAdmin, workspace_id, user.id),
      getWorkspaceRole(supabaseAdmin, workspace_id, user_id),
    ])
    if (!senderRole || !recipientRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only allow in-app relative links
    const safeLink = typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') ? link : null

    // Create notification
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id,
        workspace_id,
        type,
        title,
        message,
        link: safeLink,
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

    // Also deliver as a web push (never throws; no-op when push is not configured)
    if (user_id !== user.id) {
      await sendPushToUser(user_id, { title, body: message, url: safeLink || undefined, tag: type })
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
