import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase-server'
import { getRowWorkspaceId, getWorkspaceRole } from '@/lib/api-access'
import { createNotifications, type NotificationInput } from '@/lib/notify'
import { sanitizeHtml } from '@/lib/sanitize-html'
import { resolveMentionedIds } from '@/lib/mentions'
import { isMissingSchemaError } from '@/lib/attachments'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_COMMENT_LENGTH = 5000

/** Workspace members with their usernames (used to resolve @mentions). */
async function getMentionableMembers(workspaceId: string): Promise<Array<{ id: string; username: string }>> {
  const { data } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id, profiles:user_id(username)')
    .eq('workspace_id', workspaceId)
    .limit(1000)
  return (data || []).map((row: any) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return { id: row.user_id as string, username: (profile?.username as string) || '' }
  })
}

// Notifies @mentioned workspace members and (for new comments) the task's assignee/creator. Never throws.
// On an edit (`previousContent` given) only people mentioned for the first time are notified.
async function notifyAboutComment(
  workspaceId: string,
  taskId: string,
  actorId: string,
  content: string,
  actorName?: string,
  previousContent?: string
) {
  try {
    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('title, assignee_id, creator_id')
      .eq('id', taskId)
      .maybeSingle()
    if (!task) return

    const isEdit = previousContent !== undefined
    const link = '/dashboard/tasks'
    const who = actorName || 'Someone'
    const preview = content.trim().replace(/\s+/g, ' ').slice(0, 120)
    const entries: NotificationInput[] = []
    const notified = new Set<string>([actorId])

    // @handle mentions (only people who belong to this workspace)
    const members = await getMentionableMembers(workspaceId)
    const already = new Set(isEdit ? resolveMentionedIds(previousContent as string, members) : [])
    for (const id of resolveMentionedIds(content, members)) {
      if (notified.has(id) || already.has(id)) continue
      notified.add(id)
      entries.push({
        user_id: id,
        workspace_id: workspaceId,
        type: 'comment_mention',
        title: `${who} mentioned you`,
        message: `${(task as any).title}: ${preview}`,
        link
      })
    }

    // Owner / assignee of the task (new comments only)
    if (!isEdit) {
      for (const id of [(task as any).assignee_id, (task as any).creator_id]) {
        if (!id || notified.has(id)) continue
        if (!(await getWorkspaceRole(supabaseAdmin, workspaceId, id))) continue
        notified.add(id)
        entries.push({
          user_id: id,
          workspace_id: workspaceId,
          type: 'task_comment',
          title: `${who} commented on a task`,
          message: `${(task as any).title}: ${preview}`,
          link
        })
      }
    }

    await createNotifications(entries)
  } catch (error) {
    console.error('Error sending comment notifications:', error)
  }
}

const NOT_CONFIGURED = { error: 'Comments are not available yet', code: 'not_configured' }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
  }


  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Caller must belong to the workspace that owns the task
    // (the comment list does not depend on the access check, so both start together; the list is
    // only returned when the check passes)
    const [taskWorkspaceId, { data: comments, error }] = await Promise.all([
      getRowWorkspaceId(supabaseAdmin, 'tasks', taskId),
      supabaseAdmin
        .from('task_notes')
        .select(`
          *,
          user:profiles!user_id(id, username)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
        .limit(1000),
    ])
    if (!taskWorkspaceId || !(await getWorkspaceRole(supabaseAdmin, taskWorkspaceId, user.id))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // If table doesn't exist, return empty array instead of error
    if (error) {
      if (isMissingSchemaError(error)) {
        return NextResponse.json([])
      }
      throw error
    }

    return NextResponse.json(comments || [])
  } catch (error: any) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { task_id, content } = body

    if (!task_id || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'task_id and content are required' }, { status: 400 })
    }

    // Caller must belong to the workspace that owns the task
    const taskWorkspaceId = await getRowWorkspaceId(supabaseAdmin, 'tasks', task_id)
    if (!taskWorkspaceId || !(await getWorkspaceRole(supabaseAdmin, taskWorkspaceId, user.id))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ error: 'Comment is too long' }, { status: 413 })
    }

    const cleanContent = sanitizeHtml(content)
    if (!cleanContent.trim()) {
      return NextResponse.json({ error: 'task_id and content are required' }, { status: 400 })
    }

    const { data: comment, error } = await supabaseAdmin
      .from('task_notes')
      .insert({
        task_id,
        user_id: user.id,
        content: cleanContent
      })
      .select(`
        *,
        user:profiles!user_id(id, username)
      `)
      .single()

    if (error) {
      if (isMissingSchemaError(error)) return NextResponse.json(NOT_CONFIGURED, { status: 503 })
      throw error
    }

    await notifyAboutComment(taskWorkspaceId, task_id, user.id, content, (comment as any)?.user?.username)

    return NextResponse.json(comment)
  } catch (error: any) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

interface CommentRow {
  id: string
  task_id: string
  user_id: string | null
  content: string
}

/** Loads a comment plus the caller's role in the workspace that owns its task. */
async function loadCommentContext(
  commentId: string,
  userId: string
): Promise<{ response: NextResponse } | { row: CommentRow; workspaceId: string; role: 'admin' | 'member' }> {
  const { data: row, error } = await supabaseAdmin
    .from('task_notes')
    .select('id, task_id, user_id, content')
    .eq('id', commentId)
    .maybeSingle()
  if (error) {
    if (isMissingSchemaError(error)) return { response: NextResponse.json(NOT_CONFIGURED, { status: 503 }) }
    throw error
  }
  if (!row) return { response: NextResponse.json({ error: 'Comment not found' }, { status: 404 }) }

  const comment = row as CommentRow
  const workspaceId = await getRowWorkspaceId(supabaseAdmin, 'tasks', comment.task_id)
  const role = workspaceId ? await getWorkspaceRole(supabaseAdmin, workspaceId, userId) : null
  if (!workspaceId || !role) return { response: NextResponse.json({ error: 'Access denied' }, { status: 403 }) }

  return { row: comment, workspaceId, role }
}

// Edit a comment (author only)
export async function PUT(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)
    const id = body?.id
    const content = body?.content
    if (!id || typeof id !== 'string' || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'id and content are required' }, { status: 400 })
    }
    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ error: 'Comment is too long' }, { status: 413 })
    }

    const ctx = await loadCommentContext(id, user.id)
    if ('response' in ctx) return ctx.response
    const { row, workspaceId } = ctx

    // Only the author may edit (admins can delete, not rewrite what someone else said)
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 })
    }

    const cleanContent = sanitizeHtml(content)
    if (!cleanContent.trim()) {
      return NextResponse.json({ error: 'id and content are required' }, { status: 400 })
    }

    const select = `
        *,
        user:profiles!user_id(id, username)
      `
    let result = await supabaseAdmin
      .from('task_notes')
      .update({ content: cleanContent, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(select)
      .single()

    // No updated_at column yet: still save the text (the "edited" marker just will not show)
    if (result.error && (result.error.code === '42703' || result.error.code === 'PGRST204')) {
      result = await supabaseAdmin
        .from('task_notes')
        .update({ content: cleanContent })
        .eq('id', id)
        .eq('user_id', user.id)
        .select(select)
        .single()
    }
    if (result.error) throw result.error

    await notifyAboutComment(workspaceId, row.task_id, user.id, content, (result.data as any)?.user?.username, row.content)

    return NextResponse.json(result.data)
  } catch (error: any) {
    console.error('Error updating comment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Delete a comment (author, or a workspace admin)
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const commentId = searchParams.get('id')

  if (!commentId) {
    return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })
  }

  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const ctx = await loadCommentContext(commentId, user.id)
    if ('response' in ctx) return ctx.response
    const { row, role } = ctx

    if (row.user_id !== user.id && role !== 'admin') {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('task_notes')
      .delete()
      .eq('id', commentId)

    if (error) throw error

    return NextResponse.json({ message: 'Comment deleted' })
  } catch (error: any) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
