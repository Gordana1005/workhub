import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase-server'
import { getWorkspaceRole, omitKeys } from '@/lib/api-access'
import { syncCompletion } from '@/lib/task-status'
import { createNotifications } from '@/lib/notify'
import { generateNextOccurrence } from '@/lib/recurrence'
import {
  fetchSubtaskCounts,
  isMissingSchemaError,
  runTopLevel,
  sanitizeSubtaskTitles,
  subtasksToChecklist,
  withSubtaskCounts,
} from '@/lib/subtasks'
import { fetchLoggedSecondsByTask } from '@/lib/task-time'
import { ServerTimer } from '@/lib/server-timing'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Service role client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function subtasksUnsupported() {
  return NextResponse.json(
    { error: 'Subtasks are not available yet', code: 'subtasks_unsupported' },
    { status: 400 }
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id') || searchParams.get('workspaceId')
  const projectId = searchParams.get('project_id') || searchParams.get('projectId')
  const parentTaskId = searchParams.get('parent_task_id')
  const singleTaskId = searchParams.get('task_id')
  const includeSubtasks = searchParams.get('include_subtasks') === '1'
  const includeTime = searchParams.get('include_time') === '1'

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
  }


  const timer = new ServerTimer()
  const user = await timer.time('auth', getAuthUser())
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user has access to this workspace. The membership check is started now but only awaited
  // together with the data queries below (they are independent): one round trip instead of several.
  // No data is returned unless the check passes.
  const membershipPromise = Promise.resolve(
    supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()
  )
  const denied = async () => {
    const { data: membership } = await membershipPromise
    return membership ? null : NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const selectColumns = `
        *,
        projects(name, workspace_id, color),
        assignee:profiles!tasks_assignee_id_fkey(id, username),
        creator:profiles!tasks_creator_id_fkey(id, username)
      `

    // ?parent_task_id=<id>: the subtasks of one task (oldest first). Empty when subtasks are unavailable.
    if (parentTaskId) {
      const [{ data: children, error: childError }, deniedResponse] = await timer.time(
        'db',
        Promise.all([
          supabaseAdmin
            .from('tasks')
            .select(selectColumns)
            .eq('workspace_id', workspaceId)
            .eq('parent_task_id', parentTaskId)
            .order('created_at', { ascending: true })
            .limit(500),
          denied(),
        ])
      )
      if (deniedResponse) return deniedResponse
      if (childError) {
        if (isMissingSchemaError(childError)) return NextResponse.json([])
        throw childError
      }
      return timer.apply(NextResponse.json(children))
    }

    // ?task_id=<id>: a single task (top-level or subtask), used to resolve deep links
    if (singleTaskId) {
      const [{ data: single, error: singleError }, deniedResponse] = await timer.time(
        'db',
        Promise.all([
          supabaseAdmin
            .from('tasks')
            .select(selectColumns)
            .eq('workspace_id', workspaceId)
            .eq('id', singleTaskId)
            .limit(1),
          denied(),
        ])
      )
      if (deniedResponse) return deniedResponse
      if (singleError) throw singleError
      return timer.apply(NextResponse.json(single))
    }

    // Lists carry top-level tasks only (subtasks are loaded per parent) unless ?include_subtasks=1.
    // If the column does not exist yet the query simply runs without the restriction.
    // The task rows, the per-parent subtask counts (one grouped query, no N+1), the logged time and
    // the membership check do not depend on each other: they all run at once.
    const [{ data: tasks, error }, subtaskCounts, logged, deniedResponse] = await timer.time(
      'db',
      Promise.all([
        runTopLevel((topLevel) => {
          let query = supabaseAdmin
            .from('tasks')
            .select(selectColumns)
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(2000)
          if (projectId) query = query.eq('project_id', projectId)
          if (topLevel && !includeSubtasks) query = query.is('parent_task_id', null)
          return query
        }),
        includeSubtasks ? Promise.resolve(null) : fetchSubtaskCounts(supabaseAdmin, { workspaceId, projectId }),
        includeTime ? fetchLoggedSecondsByTask(supabaseAdmin, { workspaceId }) : Promise.resolve(null),
        denied(),
      ])
    )
    if (deniedResponse) return deniedResponse

    if (error) throw error

    let result: any[] = tasks || []
    if (subtaskCounts) result = withSubtaskCounts(result, subtaskCounts)
    if (logged) {
      result = result.map((task) => (logged[task.id] ? { ...task, logged_seconds: logged[task.id] } : task))
    }

    return timer.apply(NextResponse.json(result))
  } catch (error: any) {
    console.error('Error fetching tasks:', error)
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
    const { workspace_id, title, description, priority, due_date, assignee_id, category, estimated_hours, tags } = body
    const parentTaskId: string | null = typeof body.parent_task_id === 'string' && body.parent_task_id ? body.parent_task_id : null
    let project_id = body.project_id

    // A subtask takes its project from the parent, so project_id is only required for top-level tasks
    if (!project_id && !parentTaskId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    // The membership check, the parent lookup, the project check and the assignee check do not depend
    // on each other: run them at once and evaluate the results in the original order below.
    const [{ data: membership }, parentResult, earlyProject, assigneeRole] = await Promise.all([
      supabaseAdmin
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace_id)
        .eq('user_id', user.id)
        .single(),
      parentTaskId
        ? supabaseAdmin
            .from('tasks')
            .select('id, workspace_id, project_id, parent_task_id')
            .eq('id', parentTaskId)
            .maybeSingle()
        : Promise.resolve(null),
      // top-level tasks know their project up front (a subtask's project comes from its parent)
      !parentTaskId && project_id
        ? supabaseAdmin
            .from('projects')
            .select('id')
            .eq('id', project_id)
            .eq('workspace_id', workspace_id)
            .maybeSingle()
        : Promise.resolve(null),
      // Assignee (if different from the caller) must be a workspace member
      assignee_id && assignee_id !== user.id
        ? getWorkspaceRole(supabaseAdmin, workspace_id, assignee_id)
        : Promise.resolve(null),
    ])

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // Subtask: the parent must be a top-level task of the same workspace (one level only)
    if (parentResult) {
      const { data: parent, error: parentError } = parentResult
      if (parentError) {
        if (isMissingSchemaError(parentError)) return subtasksUnsupported()
        throw parentError
      }
      if (!parent || parent.workspace_id !== workspace_id) {
        return NextResponse.json({ error: 'Parent task not found in this workspace' }, { status: 400 })
      }
      if (parent.parent_task_id) {
        return NextResponse.json({ error: 'A subtask cannot have subtasks', code: 'subtask_nesting' }, { status: 400 })
      }
      project_id = parent.project_id
    }

    // The project must belong to the same workspace (prevents cross-workspace writes)
    if (project_id) {
      const project = parentTaskId
        ? (
            await supabaseAdmin
              .from('projects')
              .select('id')
              .eq('id', project_id)
              .eq('workspace_id', workspace_id)
              .maybeSingle()
          ).data
        : earlyProject?.data

      if (!project) {
        return NextResponse.json({ error: 'Project not found in this workspace' }, { status: 400 })
      }
    }

    // Assignee (if different from the caller) must be a workspace member
    if (assignee_id && assignee_id !== user.id) {
      if (!assigneeRole) {
        return NextResponse.json({ error: 'Assignee is not a member of this workspace' }, { status: 400 })
      }
    }

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        workspace_id,
        title,
        description,
        priority: priority || 'medium',
        due_date,
        project_id,
        // Subtasks start unassigned; top-level tasks default to the creator
        assignee_id: assignee_id || (parentTaskId ? null : user.id),
        creator_id: user.id,
        category,
        ...(typeof estimated_hours === 'number' && estimated_hours > 0 ? { estimated_hours } : {}),
        ...(Array.isArray(tags) && tags.length > 0 ? { tags } : {}),
        ...(parentTaskId ? { parent_task_id: parentTaskId } : {}),
        status: 'To Do'
      })
      .select(`
        *,
        projects(name)
      `)
      .single()

    if (error) {
      if (parentTaskId && isMissingSchemaError(error)) return subtasksUnsupported()
      throw error
    }

    // Template / duplicate flow: create the subtasks together with the task. If subtasks are not
    // available (migration 026 not applied) the titles are appended to the description as a checklist.
    const subtaskTitles = parentTaskId ? [] : sanitizeSubtaskTitles(body.subtasks)
    let subtaskCount = 0
    let subtasksFallback = false
    if (task && subtaskTitles.length > 0) {
      const base = Date.now()
      const { error: childError } = await supabaseAdmin.from('tasks').insert(
        subtaskTitles.map((childTitle, index) => ({
          workspace_id,
          project_id,
          title: childTitle,
          priority: 'medium',
          status: 'To Do',
          creator_id: user.id,
          parent_task_id: (task as any).id,
          // distinct timestamps keep the template order (lists sort subtasks by created_at)
          created_at: new Date(base + index).toISOString()
        }))
      )
      if (childError) {
        console.error('Error creating template subtasks:', childError.message)
        const description = [(task as any).description, subtasksToChecklist(subtaskTitles)].filter(Boolean).join('\n\n')
        await supabaseAdmin.from('tasks').update({ description }).eq('id', (task as any).id)
        ;(task as any).description = description
        subtasksFallback = true
      } else {
        subtaskCount = subtaskTitles.length
      }
    }

    // Tell the assignee (never the actor)
    if (task && assignee_id && assignee_id !== user.id) {
      await createNotifications([{
        user_id: assignee_id,
        workspace_id,
        type: 'task_assigned',
        title: 'Task assigned to you',
        message: String((task as any).title || title),
        link: '/dashboard/tasks'
      }])
    }

    return NextResponse.json(
      subtaskTitles.length > 0
        ? { ...task, subtask_total: subtaskCount, subtask_done: 0, ...(subtasksFallback ? { subtasks_fallback: true } : {}) }
        : task
    )
  } catch (error: any) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, ...rawUpdates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Fetch current task for comparison
    const { data: current } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!current) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Caller must belong to the task's workspace. (The optional project-move check below does not
    // depend on the role, so it starts together with it.)
    const movingProject = !!rawUpdates.project_id && rawUpdates.project_id !== current.project_id && !(current as any).parent_task_id
    const [role, moveTarget] = await Promise.all([
      getWorkspaceRole(supabaseAdmin, current.workspace_id, user.id),
      movingProject
        ? supabaseAdmin
            .from('projects')
            .select('id')
            .eq('id', rawUpdates.project_id)
            .eq('workspace_id', current.workspace_id)
            .maybeSingle()
        : Promise.resolve(null),
    ])
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Never allow moving a task between workspaces / rewriting ownership
    // (and never re-parent: subtasks are created under their parent and stay there)
    const updates = omitKeys(rawUpdates, ['workspace_id', 'creator_id', 'created_at', 'parent_task_id', 'subtask_total', 'subtask_done', 'logged_seconds'])
    const isSubtask = !!(current as any).parent_task_id

    // A subtask lives in its parent's project
    if (isSubtask) delete (updates as any).project_id

    // Moving to another project is only allowed within the same workspace
    if (updates.project_id && updates.project_id !== current.project_id) {
      if (!moveTarget?.data) {
        return NextResponse.json({ error: 'Project not found in this workspace' }, { status: 400 })
      }
    }

    // Keep is_completed / status / completed_at consistent: 'Done' <=> completed.
    const patch = syncCompletion(updates, current)

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select(`
        *,
        projects(name)
      `)
      .single()

    if (error) throw error

    // Follow-up work: the three pieces below are independent, so they run together
    const movedProject = !isSubtask && updates.project_id && updates.project_id !== current.project_id
    const newAssignee = (task as any)?.assignee_id
    const reassigned = !!(task && newAssignee && newAssignee !== current?.assignee_id && newAssignee !== user.id)
    const wasCompleted = current?.is_completed || current?.status === 'Done'
    const nowCompleted = (task as any)?.is_completed || (task as any)?.status === 'Done'
    const statusChanged = current?.status !== (task as any)?.status || current?.is_completed !== (task as any)?.is_completed
    // Subtask status changes stay quiet: no workspace-wide broadcast, no recurrence
    const broadcast = !!(task && statusChanged && !isSubtask)

    await Promise.all([
      // Moving a task to another project takes its subtasks along (best effort)
      movedProject
        ? supabaseAdmin.from('tasks').update({ project_id: updates.project_id }).eq('parent_task_id', id)
        : null,
      // Reassigned to someone else: tell the new assignee (never the actor)
      reassigned
        ? (async () => {
            if (await getWorkspaceRole(supabaseAdmin, (task as any).workspace_id, newAssignee)) {
              await createNotifications([{
                user_id: newAssignee,
                workspace_id: (task as any).workspace_id,
                type: 'task_assigned',
                title: 'Task assigned to you',
                message: String((task as any).title || 'Task'),
                link: '/dashboard/tasks'
              }])
            }
          })()
        : null,
      // Task completion / status change notification
      broadcast
        ? (async () => {
            const workspaceId = (task as any).workspace_id
            const title = (task as any).title || 'Task updated'

            const { data: members } = await supabaseAdmin
              .from('workspace_members')
              .select('user_id')
              .eq('workspace_id', workspaceId)

            const baseMessage = wasCompleted
              ? `${title} was reopened`
              : nowCompleted
                ? `${title} was completed`
                : `${title} was updated`

            const notifications = (members || [])
              .filter((m: any) => m.user_id !== user.id)
              .map((m: any) => ({
                user_id: m.user_id,
                workspace_id: workspaceId,
                type: nowCompleted ? 'task_completed' : 'task_updated',
                title: nowCompleted ? 'Task completed' : 'Task updated',
                message: baseMessage,
                link: '/dashboard/tasks'
              }))

            // In-app only: broadcasting a push to every member for each status change would be noise
            await createNotifications(notifications.map(n => ({ ...n, push: false })))

            // Completed recurring task -> create its next occurrence (guarded + idempotent, never throws)
            if (nowCompleted && !wasCompleted && (task as any).recurrence_pattern) {
              await generateNextOccurrence(supabaseAdmin, task as any)
            }
          })()
        : null,
    ])

    return NextResponse.json(task)
  } catch (error: any) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('id')
  const bulkIds = searchParams.get('bulkIds')


  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (bulkIds) {
      // Bulk delete
      const ids = bulkIds.split(',').map(s => s.trim()).filter(Boolean).slice(0, 500)

      // Only delete tasks that live in workspaces the caller belongs to
      const { data: found } = await supabaseAdmin
        .from('tasks')
        .select('id, workspace_id')
        .in('id', ids)

      const workspaceIds = Array.from(new Set((found || []).map((t: any) => t.workspace_id)))
      const roles = await Promise.all(workspaceIds.map((wsId) => getWorkspaceRole(supabaseAdmin, wsId, user.id)))
      const allowedWorkspaces = new Set<string>(workspaceIds.filter((_, index) => roles[index]))
      const allowedIds = (found || [])
        .filter((t: any) => allowedWorkspaces.has(t.workspace_id))
        .map((t: any) => t.id)

      if (allowedIds.length === 0) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const { error } = await supabaseAdmin
        .from('tasks')
        .delete()
        .in('id', allowedIds)

      if (error) throw error

      return NextResponse.json({ message: `Deleted ${allowedIds.length} tasks` })
    } else if (taskId) {
      // Single delete - caller must belong to the task's workspace
      const { data: existing } = await supabaseAdmin
        .from('tasks')
        .select('workspace_id')
        .eq('id', taskId)
        .maybeSingle()

      if (!existing) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
      if (!(await getWorkspaceRole(supabaseAdmin, existing.workspace_id, user.id))) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const { error } = await supabaseAdmin
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      return NextResponse.json({ message: 'Task deleted' })
    } else {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
