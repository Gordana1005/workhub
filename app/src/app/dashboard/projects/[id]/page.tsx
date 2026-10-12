'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getJsonCached } from '@/lib/api-cache'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowLeft, Plus, SlidersHorizontal, X } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs } from '@/components/ui/Tabs'
import NotesList from '@/components/notes/NotesList'
import type { NoteRecord, NoteTag } from '@/components/notes/noteUtils'
import { AvatarStack, DueLabel, ProgressBar, ProjectTile, useProjectStatusLabel } from '@/components/projects/ProjectCard'
import type { EditableProject } from '@/components/projects/ProjectEditDialog'
import ProjectPeople, { type ProjectMember, type WorkspacePerson } from '@/components/projects/ProjectPeople'
import ProjectTaskRow, { type ProjectTask } from '@/components/projects/ProjectTaskRow'
import type { PickerCategory, TaskFormValues } from '@/components/projects/ProjectTaskDialogs'
import {
  CATEGORY_COLORS,
  daysUntil,
  parseDay,
  progressOf,
  statusDotClass,
  statusKey,
} from '@/components/projects/projectUtils'

// Heavy / rarely-needed pieces load on demand (the note editor pulls in TipTap, the budget card the charts)
const ProjectBudgetCard = dynamic(() => import('@/components/finance/ProjectBudgetCard'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 rounded-2xl" />,
})
const NotePane = dynamic(() => import('@/components/notes/NotePane'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 rounded-2xl" />,
})
const TaskDetailModal = dynamic(() => import('@/components/tasks/TaskDetailModal'), { ssr: false })
const ProjectEditDialog = dynamic(() => import('@/components/projects/ProjectEditDialog'), { ssr: false })
const CreateTaskDialog = dynamic(() => import('@/components/projects/ProjectTaskDialogs').then((m) => m.CreateTaskDialog), {
  ssr: false,
})
const CreateCategoryDialog = dynamic(
  () => import('@/components/projects/ProjectTaskDialogs').then((m) => m.CreateCategoryDialog),
  { ssr: false }
)

interface Project extends EditableProject {
  created_at: string
  workspace_id?: string
  owner?: { id?: string; username: string } | null
}

type TabId = 'tasks' | 'people' | 'notes' | 'money'
type TaskScope = 'open' | 'done' | 'all'
type SortKey = 'due' | 'priority' | 'title'

const PRIORITY_RANK: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }

const selectClass =
  'h-9 min-w-0 rounded-lg border border-border bg-secondary px-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

const sheetSelectClass =
  'h-11 w-full min-w-0 rounded-lg border border-border bg-secondary px-2.5 text-base text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

const inputClass =
  'h-11 w-full min-w-0 rounded-lg border border-border bg-secondary px-3 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:h-10 sm:text-sm'

export default function ProjectDetailPage() {
  const t = useTranslations('pages.projects')
  const tn = useTranslations('pages.notes')
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const projectId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined)
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace)
  const statusLabel = useProjectStatusLabel()

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspacePerson[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [viewerRole, setViewerRole] = useState<string | null>(null)
  const [viewerId, setViewerId] = useState<string>('')
  const [categories, setCategories] = useState<PickerCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('tasks')

  // Notes
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [creatingNote, setCreatingNote] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteRecord | null>(null)
  const [noteEditorKey, setNoteEditorKey] = useState(0)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)

  // Tasks UI
  const [scope, setScope] = useState<TaskScope>('open')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [sortBy, setSortBy] = useState<SortKey>('due')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickBusy, setQuickBusy] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [openTask, setOpenTask] = useState<ProjectTask | null>(null)
  const [deletingTask, setDeletingTask] = useState<ProjectTask | null>(null)
  const [createTaskEver, setCreateTaskEver] = useState(false)
  const [createCategoryEver, setCreateCategoryEver] = useState(false)
  const [editEver, setEditEver] = useState(false)

  // Project actions
  const [editingProject, setEditingProject] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const workspaceId = project?.workspace_id || currentWorkspace?.id || ''
  const isAdmin = viewerRole === 'admin'

  useEffect(() => {
    if (showCreateTask) setCreateTaskEver(true)
  }, [showCreateTask])
  useEffect(() => {
    if (showCreateCategory) setCreateCategoryEver(true)
  }, [showCreateCategory])
  useEffect(() => {
    if (editingProject) setEditEver(true)
  }, [editingProject])

  // keep the active tab visible inside the scrolling tab bar
  useEffect(() => {
    document.getElementById(`project-tab-${tab}`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [tab])

  const loadProjectMembers = useCallback(async () => {
    if (!projectId) return
    try {
      const response = await fetch(`/api/projects/members?project_id=${projectId}`)
      const result = await response.json()
      if (response.ok) {
        setProjectMembers(result.members || [])
        setViewerRole(result.viewer_role ?? null)
        if (result.viewer_id) setViewerId(result.viewer_id)
      }
    } catch (error) {
      console.error('Error loading project members:', error)
    }
  }, [projectId])

  const loadNotes = useCallback(async () => {
    if (!projectId) return
    try {
      const response = await fetch(`/api/notes?project_id=${projectId}`)
      const result = await response.json()
      if (response.ok) setNotes(Array.isArray(result) ? result : [])
    } catch (error) {
      console.error('Error loading project notes:', error)
    } finally {
      setNotesLoading(false)
    }
  }, [projectId])

  const loadTasks = useCallback(
    async (ws: string) => {
      if (!projectId || !ws) return
      try {
        const response = await fetch(`/api/tasks?project_id=${projectId}&workspace_id=${ws}&include_time=1`)
        const result = await response.json()
        setTasks(response.ok && Array.isArray(result) ? result : [])
      } catch (error) {
        console.error('Error loading tasks:', error)
      }
    },
    [projectId]
  )

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        // Everything except the project row itself can start right away: members and notes only need the
        // project id, and the selected workspace (persisted) is almost always the project's workspace.
        // The project request is no longer in front of the other five.
        const hintWs = currentWorkspace?.id || ''
        const projectRequest = fetch(`/api/projects?id=${projectId}`).then(async (response) => {
          const body = await response.json()
          if (!response.ok) throw new Error(body.error)
          return body
        })
        const loadSide = (ws: string) =>
          Promise.all([
            ws ? getJsonCached<any>(`/api/task-categories?workspace_id=${ws}`).catch(() => null) : null,
            ws ? getJsonCached<any>(`/api/team?workspace_id=${ws}`).catch(() => null) : null,
            loadTasks(ws),
          ])
        const early = Promise.all([loadSide(hintWs), loadProjectMembers(), loadNotes()])
        early.catch(() => {})

        const result = await projectRequest
        if (cancelled) return
        const loaded: Project = result.project
        setProject(loaded)
        const ws = loaded.workspace_id || hintWs

        let [categoriesResult, teamResult] = (await early)[0]
        if (ws !== hintWs) {
          // deep link into a project of another workspace: reload the workspace-scoped data for it
          ;[categoriesResult, teamResult] = await loadSide(ws)
        }
        if (cancelled) return
        setCategories(categoriesResult?.categories || [])
        setWorkspaceMembers(
          (teamResult?.members || [])
            .map((member: { profiles: WorkspacePerson | null }) => member.profiles)
            .filter(Boolean)
        )
      } catch (error) {
        console.error('Error loading project data:', error)
        if (!cancelled) setProject(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // The workspace store may hydrate after the first render; the project's own workspace_id is preferred anyway.
  }, [projectId, currentWorkspace?.id, loadTasks, loadProjectMembers, loadNotes])

  /* ---------- derived data ---------- */

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((task) => task.is_completed).length
    const overdue = tasks.filter((task) => !task.is_completed && (daysUntil(task.due_date) ?? 0) < 0).length
    const upcoming = tasks
      .filter((task) => !task.is_completed && task.due_date)
      .sort((a, b) => (parseDay(a.due_date)?.getTime() ?? 0) - (parseDay(b.due_date)?.getTime() ?? 0))
      .slice(0, 5)
    return { total, done, open: total - done, overdue, upcoming, percent: progressOf(done, total) }
  }, [tasks])

  const openTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const task of tasks) {
      const id = task.assignee_id || task.assignee?.id
      if (id && !task.is_completed) counts[id] = (counts[id] || 0) + 1
    }
    return counts
  }, [tasks])

  const avatarById = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const person of workspaceMembers) map.set(person.id, person.avatar_url)
    for (const person of projectMembers) if (!map.has(person.id)) map.set(person.id, person.avatar_url)
    return map
  }, [workspaceMembers, projectMembers])

  const visibleTasks = useMemo(() => {
    const dueTime = (task: ProjectTask) => (task.due_date ? (parseDay(task.due_date)?.getTime() ?? Infinity) : Infinity)
    const list = tasks
      .filter((task) => (scope === 'all' ? true : scope === 'done' ? task.is_completed : !task.is_completed))
      .filter((task) => selectedCategory === 'all' || task.category === selectedCategory)
      .filter((task) => selectedPriority === 'all' || task.priority === selectedPriority)
    return list.sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
      if (sortBy === 'title') return a.title.localeCompare(b.title, locale)
      if (sortBy === 'priority') {
        const diff = (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0)
        if (diff) return diff
      }
      const da = dueTime(a)
      const db = dueTime(b)
      if (da === db) return 0
      return da < db ? -1 : 1
    })
  }, [tasks, scope, selectedCategory, selectedPriority, sortBy, locale])

  const activeFilterCount = (selectedCategory !== 'all' ? 1 : 0) + (selectedPriority !== 'all' ? 1 : 0) + (sortBy !== 'due' ? 1 : 0)

  /* ---------- actions ---------- */

  const createTask = async (values: TaskFormValues) => {
    if (!project || !workspaceId) return
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: values.title,
        description: values.description || null,
        priority: values.priority,
        due_date: values.due_date || null,
        assignee_id: values.assignee_id || null,
        category: values.category || null,
        workspace_id: workspaceId,
        project_id: project.id,
        is_completed: false,
      }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || t('createTaskFailed'))
    }
    setShowCreateTask(false)
    setTab('tasks')
    setScope((current) => (current === 'done' ? 'open' : current))
    await loadTasks(workspaceId)
  }

  const quickAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    const title = quickTitle.trim()
    if (!title || quickBusy || !project || !workspaceId) return
    setQuickBusy(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, workspace_id: workspaceId, project_id: project.id, is_completed: false }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t('createTaskFailed'))
      }
      setQuickTitle('')
      setScope((current) => (current === 'done' ? 'open' : current))
      await loadTasks(workspaceId)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('createTaskFailed'))
    } finally {
      setQuickBusy(false)
    }
  }

  const toggleTask = async (task: ProjectTask) => {
    const next = !task.is_completed
    setTasks((list) => list.map((item) => (item.id === task.id ? { ...item, is_completed: next } : item)))
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, is_completed: next, completed_at: next ? new Date().toISOString() : null }),
      })
      if (!response.ok) throw new Error('toggle failed')
    } catch (error) {
      console.error('Error toggling task:', error)
      setTasks((list) => list.map((item) => (item.id === task.id ? { ...item, is_completed: task.is_completed } : item)))
      setNotice(t('updateTaskFailed'))
    }
  }

  const confirmDeleteTask = async () => {
    if (!deletingTask) return
    const target = deletingTask
    setDeletingTask(null)
    try {
      const response = await fetch(`/api/tasks?id=${target.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete failed')
      setTasks((list) => list.filter((item) => item.id !== target.id))
    } catch (error) {
      console.error('Error deleting task:', error)
      setNotice(t('deleteTaskFailed'))
    }
  }

  const createCategory = async (name: string, color: string) => {
    if (!workspaceId) return
    const response = await fetch('/api/task-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, name, color }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || t('createCategoryFailed'))
    }
    setCategories((list) => [...list, { id: crypto.randomUUID(), name, color }])
    setShowCreateCategory(false)
  }

  const nextCategoryColor = () => {
    const used = new Set(categories.map((category) => category.color?.toLowerCase()))
    return CATEGORY_COLORS.find((color) => !used.has(color.toLowerCase())) || CATEGORY_COLORS[0]
  }

  const addProjectMember = async (userId: string) => {
    if (!project) return
    const response = await fetch('/api/projects/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, user_id: userId, role: 'member' }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || t('unknownError'))
    }
    await loadProjectMembers()
  }

  const removeProjectMember = async (userId: string) => {
    if (!project) return
    const response = await fetch(`/api/projects/members?project_id=${project.id}&user_id=${userId}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || t('unknownError'))
    }
    await loadProjectMembers()
  }

  const confirmDeleteProject = async () => {
    if (!project) return
    setDeleteBusy(true)
    try {
      const response = await fetch(`/api/projects?id=${project.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('unknownError'))
      router.push('/dashboard/projects')
    } catch (error) {
      setDeletingProject(false)
      setDeleteBusy(false)
      setNotice(t('deleteFailed', { error: error instanceof Error ? error.message : t('unknownError') }))
    }
  }

  /* ---------- notes ---------- */

  const noteEditorOpen = creatingNote || editingNote !== null

  const closeNoteEditor = () => {
    setCreatingNote(false)
    setEditingNote(null)
  }

  const openNewNote = () => {
    setEditingNote(null)
    setNoteEditorKey((key) => key + 1)
    setCreatingNote(true)
  }

  const openNote = (note: NoteRecord) => {
    setCreatingNote(false)
    setEditingNote(note)
  }

  const handleCreateNote = async (title: string, content: string, noteTags: NoteTag[]) => {
    if (!project) return

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, title, content, tags: noteTags }),
      })

      if (!res.ok) throw new Error('Failed to create note')

      const created = await res.json()
      setCreatingNote(false)
      setEditingNote({ ...created, tags: noteTags })
      loadNotes()
    } catch (error) {
      console.error('Failed to create note:', error)
      throw error
    }
  }

  const handleUpdateNote = async (title: string, content: string, noteTags: NoteTag[]) => {
    if (!editingNote) return

    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingNote.id, title, content, tags: noteTags }),
      })

      if (!res.ok) throw new Error('Failed to update note')

      setEditingNote((prev) => (prev ? { ...prev, title, content, tags: noteTags } : prev))
      loadNotes()
    } catch (error) {
      console.error('Failed to update note:', error)
      throw error
    }
  }

  const confirmDeleteNote = async () => {
    const id = deletingNoteId
    setDeletingNoteId(null)
    if (!id) return
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      if (editingNote?.id === id) closeNoteEditor()
      loadNotes()
    } catch (error) {
      console.error('Failed to delete note:', error)
      setNotice(tn('deleteFailed'))
    }
  }

  /* ---------- render ---------- */

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-busy aria-label={t('loading')}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (!project) {
    return (
      <EmptyState
        title={t('notFoundTitle')}
        body={t('notFoundBody')}
        action={
          <Link
            href="/dashboard/projects"
            className="rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('backToProjects')}
          </Link>
        }
      />
    )
  }

  const finished = statusKey(project.status) === 'completed' || statusKey(project.status) === 'archived'
  const formatDate = (value: string | null) => {
    const day = parseDay(value)
    return day ? day.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : t('notSet')
  }

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'tasks', label: t('tasksTab'), count: stats.open },
    { id: 'people', label: t('peopleTab'), count: projectMembers.length },
    { id: 'notes', label: t('notesTab'), count: notes.length },
    { id: 'money', label: t('moneyTab') },
  ]

  const scopes: { id: TaskScope; label: string; count: number }[] = [
    { id: 'open', label: t('filterOpen'), count: stats.open },
    { id: 'done', label: t('filterDone'), count: stats.done },
    { id: 'all', label: t('filterAll'), count: stats.total },
  ]

  const filterFields = (compact: boolean) => {
    const wrap = compact ? '' : 'block'
    const label = compact ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-text-secondary'
    const field = compact ? selectClass : sheetSelectClass
    return (
      <>
        <label className={wrap}>
          <span className={label}>{t('category')}</span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className={`${field} ${compact ? 'max-w-[11rem]' : ''}`}
          >
            <option value="all">{t('allCategories')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className={wrap}>
          <span className={label}>{t('priorityField')}</span>
          <select value={selectedPriority} onChange={(event) => setSelectedPriority(event.target.value)} className={field}>
            <option value="all">{t('allPriorities')}</option>
            <option value="urgent">{t('priority.urgent')}</option>
            <option value="high">{t('priority.high')}</option>
            <option value="medium">{t('priority.medium')}</option>
            <option value="low">{t('priority.low')}</option>
          </select>
        </label>
        <label className={wrap}>
          <span className={label}>{t('sortBy')}</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)} className={field}>
            <option value="due">{t('dueDate')}</option>
            <option value="priority">{t('priorityField')}</option>
            <option value="title">{t('titleAz')}</option>
          </select>
        </label>
      </>
    )
  }

  const projectMenu = (
    <IconMenu
      label={t('projectActions')}
      buttonClassName="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-surface-hover sm:h-9 sm:w-9"
      items={[
        { label: t('editProject'), onClick: () => setEditingProject(true) },
        { label: t('deleteProject'), onClick: () => setDeletingProject(true), danger: true },
      ]}
    />
  )

  return (
    <div className="min-w-0 max-w-full space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <Link
          href="/dashboard/projects"
          className="-ml-2 inline-flex h-11 min-w-0 max-w-full items-center gap-1.5 rounded-lg px-2 text-sm text-text-secondary transition-colors hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{t('backToProjects')}</span>
        </Link>
        <div className="-mr-2 shrink-0 sm:hidden">{projectMenu}</div>
      </div>

      {notice ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <p className="min-w-0 flex-1">{notice}</p>
          <button
            type="button"
            aria-label={t('close')}
            onClick={() => setNotice(null)}
            className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-danger/10 active:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <ProjectTile project={project} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 break-words text-xl font-semibold leading-tight tracking-tight text-text-primary sm:text-2xl">
              {project.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className={`h-2 w-2 rounded-full ${statusDotClass(project.status)}`} />
                {statusLabel(project.status)}
              </span>
              <DueLabel endDate={project.end_date} finished={finished} />
              {stats.overdue > 0 ? (
                <span className="font-medium text-danger">{t('overdueCount', { count: stats.overdue })}</span>
              ) : null}
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {projectMembers.length > 0 ? (
              <button
                type="button"
                onClick={() => setTab('people')}
                aria-label={t('peopleTab')}
                className="hidden rounded-full p-1.5 transition-colors hover:bg-surface-hover active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:block"
              >
                <AvatarStack members={projectMembers} total={projectMembers.length} max={5} />
              </button>
            ) : null}
            <Button type="button" className="gap-2" onClick={() => setShowCreateTask(true)} aria-label={t('addTask')}>
              <Plus className="h-4 w-4" aria-hidden />
              <span>{t('addTask')}</span>
            </Button>
            {projectMenu}
          </div>
        </div>

        {project.description ? (
          <p className="line-clamp-3 max-w-4xl whitespace-pre-line text-sm leading-relaxed text-text-secondary">
            {project.description}
          </p>
        ) : null}

        {stats.total > 0 ? (
          <div className="flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <ProgressBar percent={stats.percent} label={t('completion')} />
            </div>
            <p className="shrink-0 text-xs text-text-secondary">
              {t('tasksDone', { done: stats.done, total: stats.total })} ·{' '}
              <span className="tabular-nums">{stats.percent}%</span>
            </p>
          </div>
        ) : null}

        <Button type="button" className="h-11 w-full gap-2 sm:hidden" onClick={() => setShowCreateTask(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          {t('addTask')}
        </Button>
      </header>

      {/* Tabs */}
      <Tabs
        ariaLabel={project.name}
        idPrefix="project"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={tabs.map((item) => ({ ...item, count: item.count || undefined }))}
        className="-mx-4 px-4 [-webkit-mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%-28px),transparent)] [mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%-28px),transparent)] sm:-mx-0 sm:px-0 sm:[-webkit-mask-image:none] sm:[mask-image:none]"
      />

      {tab === 'tasks' && (
        <div
          role="tabpanel"
          id="project-panel-tasks"
          aria-labelledby="project-tab-tasks"
          className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]"
        >
          <div className="min-w-0 space-y-3">
            <form onSubmit={quickAdd} className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(event) => setQuickTitle(event.target.value)}
                  placeholder={t('quickAddPlaceholder')}
                  aria-label={t('quickAddPlaceholder')}
                  enterKeyHint="done"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <Button type="submit" variant="secondary" disabled={!quickTitle.trim() || quickBusy} className="h-11 shrink-0 sm:h-10">
                {t('quickAddSubmit')}
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <SegmentedControl
                ariaLabel={t('tasksTab')}
                value={scope}
                onChange={setScope}
                fullWidth
                className="min-w-0 flex-1 sm:w-auto sm:flex-none"
                options={scopes.map((item) => ({
                  value: item.id,
                  label: (
                    <>
                      {item.label}
                      <span className="hidden text-xs tabular-nums text-text-muted sm:inline">{item.count}</span>
                    </>
                  ),
                }))}
              />

              <div className="ml-auto hidden items-center gap-2 md:flex">{filterFields(true)}</div>
              <Button
                type="button"
                variant="secondary"
                aria-label={t('filters')}
                className="relative h-10 w-10 shrink-0 gap-1.5 p-0 sm:w-auto sm:px-3 md:hidden"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t('filters')}</span>
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-white sm:static sm:px-1.5">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </div>

            {visibleTasks.length === 0 ? (
              tasks.length === 0 ? (
                <EmptyState
                  title={t('noTasks')}
                  body={t('noTasksBody')}
                  action={
                    <Button type="button" variant="secondary" className="gap-2" onClick={() => setShowCreateTask(true)}>
                      <Plus className="h-4 w-4" aria-hidden />
                      {t('createFirstTask')}
                    </Button>
                  }
                />
              ) : scope === 'open' && stats.open === 0 && selectedCategory === 'all' && selectedPriority === 'all' ? (
                <EmptyState title={t('allDoneTitle')} body={t('allDoneBody')} />
              ) : (
                <EmptyState title={t('noTasksMatch')} />
              )
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface [&>li:first-child]:rounded-t-2xl [&>li:last-child]:rounded-b-2xl">
                {visibleTasks.map((task) => (
                  <ProjectTaskRow
                    key={task.id}
                    task={task}
                    assigneeAvatar={task.assignee?.id ? avatarById.get(task.assignee.id) : undefined}
                    onOpen={() => setOpenTask(task)}
                    onToggle={() => toggleTask(task)}
                    onDelete={() => setDeletingTask(task)}
                  />
                ))}
              </ul>
            )}
          </div>

          <aside className="hidden min-w-0 xl:block">
            <div className="sticky top-20 divide-y divide-border rounded-2xl border border-border bg-surface">
              <section className="space-y-3 p-4">
                <h2 className="text-sm font-semibold text-text-primary">{t('projectInfo')}</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-muted">{t('statusField')}</dt>
                    <dd className="inline-flex items-center gap-1.5 text-text-primary">
                      <span aria-hidden className={`h-2 w-2 rounded-full ${statusDotClass(project.status)}`} />
                      {statusLabel(project.status)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-muted">{t('startDate')}</dt>
                    <dd className="text-text-primary">{formatDate(project.start_date)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-muted">{t('endDate')}</dt>
                    <dd className="text-text-primary">{formatDate(project.end_date)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-muted">{t('created')}</dt>
                    <dd className="text-text-primary">{formatDate(project.created_at)}</dd>
                  </div>
                  {project.owner?.username ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-text-muted">{t('createdBy')}</dt>
                      <dd className="min-w-0 truncate text-text-primary">{project.owner.username}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section className="space-y-3 p-4">
                <h2 className="text-sm font-semibold text-text-primary">{t('upcoming')}</h2>
                {stats.upcoming.length === 0 ? (
                  <p className="text-sm text-text-muted">{t('nothingUpcoming')}</p>
                ) : (
                  <ul className="space-y-1">
                    {stats.upcoming.map((task) => {
                      const diff = daysUntil(task.due_date)
                      const day = parseDay(task.due_date)
                      return (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => setOpenTask(task)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <span className="min-w-0 truncate text-text-primary">{task.title}</span>
                            <span
                              className={`shrink-0 text-xs tabular-nums ${
                                diff !== null && diff < 0
                                  ? 'font-medium text-danger'
                                  : diff === 0
                                    ? 'font-medium text-warning'
                                    : 'text-text-muted'
                              }`}
                            >
                              {day?.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-text-primary">{t('projectTeam')}</h2>
                  {projectMembers.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setTab('people')}
                      className="rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {t('seeAll')}
                    </button>
                  ) : null}
                </div>
                {projectMembers.length === 0 ? (
                  <p className="text-sm text-text-muted">{t('noMembers')}</p>
                ) : (
                  <ul className="space-y-2">
                    {projectMembers.slice(0, 5).map((member) => (
                      <li key={member.id} className="flex items-center gap-2.5">
                        <Avatar
                          src={member.avatar_url}
                          alt={member.username || t('unknownUser')}
                          fallback={(member.username || '?').slice(0, 2).toUpperCase()}
                          size="sm"
                          className="h-7 w-7 text-[10px]"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                          {member.username || t('unknownUser')}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-text-muted">{openTaskCounts[member.id] || 0}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </aside>
        </div>
      )}

      {tab === 'people' && (
        <div role="tabpanel" id="project-panel-people" aria-labelledby="project-tab-people">
          <ProjectPeople
            members={projectMembers}
            openTaskCounts={openTaskCounts}
            workspaceMembers={workspaceMembers}
            isAdmin={isAdmin}
            onAdd={addProjectMember}
            onRemove={removeProjectMember}
          />
        </div>
      )}

      {tab === 'notes' && (
        <div role="tabpanel" id="project-panel-notes" aria-labelledby="project-tab-notes" className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate text-base font-semibold text-text-primary">{t('notesTab')}</h2>
            <Button type="button" variant="secondary" className="h-11 shrink-0 gap-2 sm:h-10" onClick={openNewNote} aria-label={tn('newNote')}>
              <Plus className="h-4 w-4" aria-hidden />
              <span>{tn('newNote')}</span>
            </Button>
          </div>

          {notesLoading ? (
            <div className="space-y-2" role="status" aria-busy aria-label={tn('loading')}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-[4.5rem] rounded-xl" />
              ))}
            </div>
          ) : notes.length === 0 && !noteEditorOpen ? (
            <EmptyState title={t('noNotes')} body={t('noNotesBody')} />
          ) : (
            <div className="flex min-w-0 flex-col lg:flex-row lg:items-start lg:gap-4">
              <section className={`min-w-0 ${noteEditorOpen ? 'lg:w-80 lg:shrink-0' : 'w-full'}`}>
                {notes.length === 0 ? (
                  <p className="rounded-2xl border border-border bg-surface px-4 py-8 text-center text-sm text-text-secondary">
                    {t('noNotes')}
                  </p>
                ) : (
                  <div className="max-w-full overflow-hidden rounded-2xl border border-border bg-surface">
                    <NotesList
                      notes={notes}
                      selectedId={editingNote?.id}
                      showUpdated
                      showProject={false}
                      onOpen={openNote}
                      onDelete={setDeletingNoteId}
                    />
                  </div>
                )}
              </section>

              {noteEditorOpen ? (
                <section className="min-w-0 max-lg:contents lg:flex-1">
                  <NotePane
                    key={editingNote?.id ?? `create-${noteEditorKey}`}
                    note={editingNote}
                    workspaceId={project.workspace_id ?? currentWorkspace?.id ?? ''}
                    projects={[{ id: project.id, name: project.name }]}
                    defaultProjectId={project.id}
                    currentUserId={viewerId || null}
                    fullScreenBelow="lg"
                    className="lg:h-[calc(100dvh-14rem)] lg:min-h-[32rem]"
                    onSave={editingNote ? handleUpdateNote : handleCreateNote}
                    onDelete={setDeletingNoteId}
                    onClose={closeNoteEditor}
                  />
                </section>
              ) : null}
            </div>
          )}
        </div>
      )}

      {tab === 'money' && (
        <div role="tabpanel" id="project-panel-money" aria-labelledby="project-tab-money" className="min-w-0 max-w-full">
          <ProjectBudgetCard projectId={project.id} />
        </div>
      )}

      {editEver ? (
        <ProjectEditDialog
          project={editingProject ? project : null}
          createdBy={project.owner?.username}
          onClose={() => setEditingProject(false)}
          onSaved={(saved) => {
            setEditingProject(false)
            setProject((current) => (current ? { ...current, ...saved } : current))
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deletingProject}
        title={t('deleteProject')}
        body={t('deleteConfirmNamed', { name: project.name })}
        confirmLabel={t('deleteProject')}
        cancelLabel={t('cancel')}
        busy={deleteBusy}
        onConfirm={confirmDeleteProject}
        onClose={() => setDeletingProject(false)}
      />

      <ConfirmDialog
        open={Boolean(deletingTask)}
        title={t('deleteTask')}
        body={deletingTask ? t('deleteTaskConfirm', { title: deletingTask.title }) : undefined}
        confirmLabel={t('deleteTask')}
        cancelLabel={t('cancel')}
        onConfirm={confirmDeleteTask}
        onClose={() => setDeletingTask(null)}
      />

      <ConfirmDialog
        open={Boolean(deletingNoteId)}
        title={tn('deleteNote')}
        body={tn('deleteConfirm')}
        confirmLabel={tn('deleteNote')}
        cancelLabel={t('cancel')}
        onConfirm={confirmDeleteNote}
        onClose={() => setDeletingNoteId(null)}
      />

      <Dialog
        open={filtersOpen}
        title={t('filters')}
        onClose={() => setFiltersOpen(false)}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full sm:h-10 sm:w-auto"
              onClick={() => {
                setSelectedCategory('all')
                setSelectedPriority('all')
                setSortBy('due')
              }}
            >
              {t('clearFilters')}
            </Button>
            <Button type="button" className="h-11 w-full sm:h-10 sm:w-auto" onClick={() => setFiltersOpen(false)}>
              {t('done')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">{filterFields(false)}</div>
      </Dialog>

      {createTaskEver ? (
        <CreateTaskDialog
          open={showCreateTask}
          members={workspaceMembers}
          categories={categories}
          defaultAssigneeId={viewerId}
          onClose={() => setShowCreateTask(false)}
          onSubmit={createTask}
          onNewCategory={() => setShowCreateCategory(true)}
        />
      ) : null}

      {createCategoryEver ? (
        <CreateCategoryDialog
          open={showCreateCategory}
          initialColor={nextCategoryColor()}
          onClose={() => setShowCreateCategory(false)}
          onSubmit={createCategory}
        />
      ) : null}

      {openTask ? (
        <TaskDetailModal
          task={openTask}
          workspaceId={workspaceId}
          onClose={() => setOpenTask(null)}
          onSave={() => loadTasks(workspaceId)}
          onDelete={(taskId) => {
            setTasks((list) => list.filter((item) => item.id !== taskId))
            setOpenTask(null)
          }}
        />
      ) : null}
    </div>
  )
}
