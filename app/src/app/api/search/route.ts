import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { getWorkspaceRole } from '@/lib/api-access'
import { ServerTimer } from '@/lib/server-timing'

export const dynamic = 'force-dynamic'

// Service-role client (bypasses RLS). Every query below is scoped to a workspace the caller belongs to.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ResultType = 'task' | 'project' | 'note' | 'plan' | 'milestone' | 'person' | 'comment'

interface SearchResult {
  type: ResultType
  id: string
  title: string
  subtitle: string
  href: string
  meta: Record<string, unknown>
}

type GroupKey = 'tasks' | 'projects' | 'notes' | 'plans' | 'people' | 'comments'

const MIN_QUERY = 2
const MAX_QUERY = 80
const FETCH_PER_GROUP = 30 // fetched, ranked in memory, then trimmed to `limit`

const NO_STORE = { 'Cache-Control': 'no-store' }

/** Never let one failing table (missing migration, bad column) break the whole search. */
async function safe<T>(builder: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await builder
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

/** Plain-text version of an HTML string (notes store HTML). */
function toPlain(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** A short excerpt around the first match, or null when the text does not contain the query. */
function snippetOf(text: string | null | undefined, q: string): string | null {
  const plain = toPlain(text)
  if (!plain) return null
  const index = plain.toLowerCase().indexOf(q.toLowerCase())
  if (index < 0) return null
  const start = Math.max(0, index - 40)
  const end = Math.min(plain.length, index + q.length + 90)
  return `${start > 0 ? '…' : ''}${plain.slice(start, end).trim()}${end < plain.length ? '…' : ''}`
}

/** 0 exact, 1 prefix, 2 word-prefix, 3 contains, 4 matched elsewhere (description, content...). */
function titleScore(title: string, q: string): number {
  const lower = title.toLowerCase()
  const ql = q.toLowerCase()
  if (lower === ql) return 0
  if (lower.startsWith(ql)) return 1
  const at = lower.indexOf(ql)
  if (at < 0) return 4
  return /[^\p{L}\p{N}]/u.test(lower[at - 1] ?? ' ') ? 2 : 3
}

function time(value: unknown): number {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN
  return Number.isNaN(parsed) ? 0 : parsed
}

interface Ranked {
  result: SearchResult
  score: number
  done: boolean
  recency: number
}

function rank(items: Ranked[], limit: number): SearchResult[] {
  return items
    .sort((a, b) => a.score - b.score || Number(a.done) - Number(b.done) || b.recency - a.recency)
    .slice(0, limit)
    .map((item) => item.result)
}

export async function GET(request: Request) {
  const timer = new ServerTimer()
  const user = await timer.time('auth', getAuthUser())
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id') || searchParams.get('workspaceId')
  const rawQuery = (searchParams.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY)
  const limit = Math.min(10, Math.max(1, Number.parseInt(searchParams.get('limit') || '6', 10) || 6))

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400, headers: NO_STORE })
  }
  // The membership check runs while the searches do (independent); results are only used if it passes.
  const rolePromise = getWorkspaceRole(supabaseAdmin, workspaceId, user.id)
  const accessDenied = () => NextResponse.json({ error: 'Access denied' }, { status: 403, headers: NO_STORE })

  const empty = { query: rawQuery, total: 0, groups: [] as { key: GroupKey; items: SearchResult[] }[] }
  if ([...rawQuery].length < MIN_QUERY) {
    if (!(await rolePromise)) return accessDenied()
    return NextResponse.json(empty, { headers: NO_STORE })
  }

  // Pattern safety. `likeText` escapes the LIKE wildcards; PostgREST's quoted-value syntax inside
  // or() needs a further backslash/quote escape, and quoting keeps commas/parentheses literal.
  const q = rawQuery.replace(/[\\"]/g, ' ').replace(/\s+/g, ' ').trim()
  const likeText = q.replace(/[%_]/g, (m) => `\\${m}`)
  const orValue = `"%${likeText.replace(/\\/g, '\\\\')}%"`
  const orFilter = (...columns: string[]) => columns.map((column) => `${column}.ilike.${orValue}`).join(',')

  const [role, tasks, projects, notes, plans, milestones, members, comments] = await timer.time('db', Promise.all([
    rolePromise,
    safe<any>(
      supabaseAdmin
        .from('tasks')
        .select(
          'id, title, description, status, priority, due_date, is_completed, created_at, projects(name, color), assignee:profiles!tasks_assignee_id_fkey(username)'
        )
        .eq('workspace_id', workspaceId)
        .or(orFilter('title', 'description'))
        .order('created_at', { ascending: false })
        .limit(FETCH_PER_GROUP)
    ),
    safe<any>(
      supabaseAdmin
        .from('projects')
        .select('id, name, description, color, created_at')
        .eq('workspace_id', workspaceId)
        .or(orFilter('name', 'description'))
        .order('created_at', { ascending: false })
        .limit(FETCH_PER_GROUP)
    ),
    safe<any>(
      supabaseAdmin
        .from('notes')
        .select('id, title, content, created_at, updated_at, project:projects(name), author:profiles(username)')
        .eq('workspace_id', workspaceId)
        .or(orFilter('title', 'content'))
        .order('updated_at', { ascending: false })
        .limit(FETCH_PER_GROUP)
    ),
    safe<any>(
      supabaseAdmin
        .from('plans')
        .select('id, name, goal, description, status, end_date, updated_at, created_at')
        .eq('workspace_id', workspaceId)
        .or(orFilter('name', 'goal', 'description'))
        .order('created_at', { ascending: false })
        .limit(FETCH_PER_GROUP)
    ),
    safe<any>(
      supabaseAdmin
        .from('plan_milestones')
        .select('id, plan_id, name, description, target_date, is_completed, created_at, plans!inner(name, workspace_id)')
        .eq('plans.workspace_id', workspaceId)
        .or(orFilter('name', 'description'))
        .order('target_date', { ascending: false })
        .limit(FETCH_PER_GROUP)
    ),
    safe<any>(supabaseAdmin.from('workspace_members').select('user_id, role').eq('workspace_id', workspaceId).limit(2000)),
    safe<any>(
      supabaseAdmin
        .from('task_notes')
        .select('id, task_id, content, created_at, tasks!inner(title, workspace_id), user:profiles!user_id(username)')
        .eq('tasks.workspace_id', workspaceId)
        .ilike('content', `%${likeText}%`)
        .order('created_at', { ascending: false })
        .limit(FETCH_PER_GROUP)
    ),
  ]))
  if (!role) return accessDenied()

  // People: workspace members whose profile matches.
  const roleByUser = new Map<string, string>(members.map((m: any) => [m.user_id as string, m.role as string]))
  const memberIds = Array.from(roleByUser.keys())
  const profiles = memberIds.length
    ? await safe<any>(
        supabaseAdmin
          .from('profiles')
          .select('id, username, full_name, email, avatar_url')
          .in('id', memberIds)
          .or(orFilter('username', 'full_name', 'email'))
          .limit(FETCH_PER_GROUP)
      )
    : []

  const taskItems: Ranked[] = tasks.map((task: any) => {
    const titleHit = titleScore(task.title ?? '', q) < 4
    const projectName: string = task.projects?.name ?? ''
    return {
      result: {
        type: 'task',
        id: task.id,
        title: task.title,
        subtitle: (!titleHit && snippetOf(task.description, q)) || projectName,
        href: `/dashboard/tasks?task=${task.id}`,
        meta: {
          status: task.status ?? null,
          priority: task.priority ?? null,
          dueDate: task.due_date ?? null,
          isCompleted: Boolean(task.is_completed),
          project: projectName || null,
          projectColor: task.projects?.color ?? null,
          assignee: task.assignee?.username ?? null,
        },
      },
      score: titleScore(task.title ?? '', q),
      done: Boolean(task.is_completed),
      recency: time(task.created_at),
    }
  })

  const projectItems: Ranked[] = projects.map((project: any) => ({
    result: {
      type: 'project',
      id: project.id,
      title: project.name,
      subtitle: snippetOf(project.description, q) || toPlain(project.description).slice(0, 110),
      href: `/dashboard/projects/${project.id}`,
      meta: { color: project.color ?? null },
    },
    score: titleScore(project.name ?? '', q),
    done: false,
    recency: time(project.created_at),
  }))

  const noteItems: Ranked[] = []
  for (const note of notes as any[]) {
    const score = titleScore(note.title ?? '', q)
    const snippet = snippetOf(note.content, q)
    // ILIKE on raw HTML can match tag names/attributes; only keep notes whose visible text matches.
    if (score >= 4 && !snippet) continue
    noteItems.push({
      result: {
        type: 'note',
        id: note.id,
        title: note.title || '',
        subtitle: snippet || toPlain(note.content).slice(0, 110),
        href: `/dashboard/notes?note=${note.id}`,
        meta: { project: note.project?.name ?? null, author: note.author?.username ?? null, updatedAt: note.updated_at ?? note.created_at ?? null },
      },
      score,
      done: false,
      recency: time(note.updated_at ?? note.created_at),
    })
  }

  const planItems: Ranked[] = [
    ...plans.map((plan: any) => ({
      result: {
        type: 'plan' as const,
        id: plan.id,
        title: plan.name,
        subtitle: (titleScore(plan.name ?? '', q) >= 4 && (snippetOf(plan.goal, q) || snippetOf(plan.description, q))) || plan.goal || '',
        href: `/dashboard/plans/${plan.id}`,
        meta: { status: plan.status ?? null, endDate: plan.end_date ?? null },
      },
      score: titleScore(plan.name ?? '', q),
      done: plan.status === 'completed' || plan.status === 'cancelled',
      recency: time(plan.updated_at ?? plan.created_at),
    })),
    ...milestones.map((milestone: any) => ({
      result: {
        type: 'milestone' as const,
        id: milestone.id,
        title: milestone.name,
        subtitle: milestone.plans?.name ?? '',
        href: `/dashboard/plans/${milestone.plan_id}`,
        meta: { targetDate: milestone.target_date ?? null, isCompleted: Boolean(milestone.is_completed), plan: milestone.plans?.name ?? null },
      },
      score: titleScore(milestone.name ?? '', q),
      done: Boolean(milestone.is_completed),
      recency: time(milestone.created_at),
    })),
  ]

  const peopleItems: Ranked[] = profiles.map((profile: any) => {
    const name: string = profile.full_name || profile.username || profile.email || ''
    return {
      result: {
        type: 'person',
        id: profile.id,
        title: name,
        subtitle: profile.full_name && profile.username ? `@${profile.username}` : profile.email || '',
        href: '/dashboard/team',
        meta: { role: roleByUser.get(profile.id) ?? null, avatarUrl: profile.avatar_url ?? null, email: profile.email ?? null },
      },
      score: Math.min(titleScore(profile.username ?? '', q), titleScore(profile.full_name ?? '', q), titleScore(name, q)),
      done: false,
      recency: 0,
    }
  })

  const commentItems: Ranked[] = []
  for (const comment of comments as any[]) {
    const snippet = snippetOf(comment.content, q)
    if (!snippet) continue
    commentItems.push({
      result: {
        type: 'comment',
        id: comment.id,
        title: snippet,
        subtitle: comment.tasks?.title ?? '',
        href: `/dashboard/tasks?task=${comment.task_id}`,
        meta: { task: comment.tasks?.title ?? null, author: comment.user?.username ?? null, createdAt: comment.created_at ?? null },
      },
      score: 4,
      done: false,
      recency: time(comment.created_at),
    })
  }

  const groups = (
    [
      { key: 'tasks', items: rank(taskItems, limit) },
      { key: 'projects', items: rank(projectItems, limit) },
      { key: 'notes', items: rank(noteItems, limit) },
      { key: 'plans', items: rank(planItems, limit) },
      { key: 'people', items: rank(peopleItems, limit) },
      { key: 'comments', items: rank(commentItems, limit) },
    ] as { key: GroupKey; items: SearchResult[] }[]
  ).filter((group) => group.items.length > 0)

  return timer.apply(
    NextResponse.json(
      { query: rawQuery, total: groups.reduce((sum, group) => sum + group.items.length, 0), groups },
      { headers: NO_STORE }
    )
  )
}
