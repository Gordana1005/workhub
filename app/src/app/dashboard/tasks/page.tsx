'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { AnimatePresence } from 'framer-motion'
import { CalendarDays, ChevronDown, ChevronRight, LayoutGrid, List, ListFilter, Plus, Search, X } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'
import { TaskRow } from '@/components/ui/TaskRow'
import PageFill from '@/components/shell/PageFill'
import QuickTaskForm, { type QuickTaskInitial } from '@/components/create/QuickTaskForm'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useDebounce } from '@/hooks/useDebounce'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import DetailSheet from '@/components/tasks/DetailSheet'
import TaskDetailPanel from '@/components/tasks/TaskDetailPanel'
import TaskFilters, { VIEWS, type ViewId } from '@/components/tasks/TaskFilters'
import TaskListRow from '@/components/tasks/TaskListRow'
import TemplateSelector from '@/components/tasks/TemplateSelector'
import {
  compareTasks,
  dayKey,
  fetchMembers,
  fetchProjects,
  isDone,
  normalizeTask,
  parseDayKey,
  priorityLabel,
  toDayKey,
  todayKey,
} from '@/components/tasks/taskUtils'
import type { MemberOption, Priority, ProjectOption, Task } from '@/components/tasks/types'

// Heavy views are loaded on demand
const KanbanBoard = dynamic(() => import('@/components/tasks/KanbanBoard'), {
  loading: () => <LoadingSkeleton type="board" />,
  ssr: false,
})

const CalendarView = dynamic(() => import('@/components/tasks/CalendarView'), {
  loading: () => <LoadingSkeleton type="calendar" />,
  ssr: false,
})

type Mode = 'list' | 'board' | 'calendar'
type GroupBy = 'due' | 'project' | 'none'

interface Group {
  key: string
  label: string
  tone?: 'danger' | 'primary'
  tasks: Task[]
  collapsible?: boolean
}

const UI_KEY = 'trackwork-tasks-ui'

const selectClass =
  'h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

function matchesView(task: Task, view: ViewId, userId: string, today: string) {
  const done = isDone(task)
  const due = dayKey(task.due_date)
  switch (view) {
    case 'all':
      return true
    case 'mine':
      return !done && !!userId && task.assignee_id === userId
    case 'today':
      return !done && due === today
    case 'upcoming':
      return !done && !!due && due > today
    case 'overdue':
      return !done && !!due && due < today
    case 'done':
      return done
  }
}

export default function TasksPage() {
  const t = useTranslations('pages.tasks')
  const { confirm, dialog } = useConfirm()
  const format = useFormatter()
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace)
  const workspaceId = currentWorkspace?.id || ''
  const currentUserId = useCurrentUserId()

  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [members, setMembers] = useState<MemberOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const [mode, setMode] = useState<Mode>('list')
  const [groupBy, setGroupBy] = useState<GroupBy>('due')
  const [view, setView] = useState<ViewId>('all')
  const [uiReady, setUiReady] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [projectId, setProjectId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<'' | Priority>('')

  const [openId, setOpenId] = useState<string | null>(null)
  const [cursorId, setCursorId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [completedOpen, setCompletedOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createInitial, setCreateInitial] = useState<QuickTaskInitial | undefined>(undefined)

  const searchRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(searchQuery, 250)
  const isMd = useMediaQuery('(min-width: 768px)')
  const is2xl = useMediaQuery('(min-width: 1536px)')

  // Remembered layout choices
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(UI_KEY) || '{}')
      if (saved.mode === 'list' || saved.mode === 'board' || saved.mode === 'calendar') setMode(saved.mode)
      if (saved.groupBy === 'due' || saved.groupBy === 'project' || saved.groupBy === 'none') setGroupBy(saved.groupBy)
      if (VIEWS.some((item) => item.id === saved.view)) setView(saved.view)
    } catch {
      // storage unavailable: defaults are fine
    }
    setUiReady(true)
  }, [])

  useEffect(() => {
    if (!uiReady) return
    try {
      window.localStorage.setItem(UI_KEY, JSON.stringify({ mode, groupBy, view }))
    } catch {
      // ignore
    }
  }, [mode, groupBy, view, uiReady])

  // The board needs room: phones fall back to the list
  const effectiveMode: Mode = mode === 'board' && !isMd ? 'list' : mode

  const loadTasks = useCallback(
    async (silent = false) => {
      if (!workspaceId) {
        setLoading(false)
        return
      }
      try {
        if (!silent) setLoading(true)
        const response = await fetch(`/api/tasks?workspace_id=${workspaceId}`)
        const result = await response.json()
        if (!response.ok) throw new Error(result?.error || 'Error loading tasks')
        setTasks((Array.isArray(result) ? result : []).map(normalizeTask))
        setLoadFailed(false)
      } catch (error) {
        console.error('Error loading tasks:', error)
        if (!silent) setTasks([])
        setLoadFailed(true)
      } finally {
        setLoading(false)
      }
    },
    [workspaceId]
  )

  useEffect(() => {
    if (!workspaceId) return
    setOpenId(null)
    setCursorId(null)
    setSelected([])
    loadTasks()
    fetchProjects(workspaceId).then(setProjects).catch((error) => console.error('Error loading projects:', error))
    fetchMembers(workspaceId, t('unknownUser'))
      .then(setMembers)
      .catch((error) => console.error('Error loading team members:', error))
  }, [workspaceId, loadTasks, t])

  // Tasks created from the global "New" menu
  useEffect(() => {
    const onCreated = () => loadTasks(true)
    window.addEventListener('trackwork:task-created', onCreated)
    return () => window.removeEventListener('trackwork:task-created', onCreated)
  }, [loadTasks])

  // ---- mutations -------------------------------------------------------

  const replaceTask = useCallback((next: Task) => {
    setTasks((prev) => prev.map((task) => (task.id === next.id ? next : task)))
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id))
    setSelected((prev) => prev.filter((item) => item !== id))
    setOpenId((prev) => (prev === id ? null : prev))
  }, [])

  const patchTask = async (id: string, body: Record<string, unknown>) => {
    const response = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    })
    if (!response.ok) throw new Error('Update failed')
  }

  const toggleComplete = async (task: Task) => {
    const next = !isDone(task)
    replaceTask({
      ...task,
      is_completed: next,
      status: next ? 'Done' : task.status === 'Done' ? 'To Do' : task.status,
    })
    try {
      await patchTask(task.id, { is_completed: next })
    } catch (error) {
      console.error('Error toggling task:', error)
      replaceTask(task)
    }
  }

  const moveTask = async (id: string, status: string) => {
    const task = tasks.find((item) => item.id === id)
    if (!task) return
    replaceTask({ ...task, status, is_completed: status === 'Done' })
    try {
      await patchTask(id, { status })
    } catch (error) {
      console.error('Error moving task:', error)
      replaceTask(task)
    }
  }

  const deleteTask = async (id: string) => {
    if (!(await confirm({ title: t('confirmDeleteTask'), confirmLabel: t('deleteTask') }))) return
    try {
      const response = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
      if (response.ok) removeTask(id)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const bulkComplete = async () => {
    try {
      await Promise.all(selected.map((id) => patchTask(id, { is_completed: true })))
    } catch (error) {
      console.error('Error completing tasks:', error)
    }
    setSelected([])
    loadTasks(true)
  }

  const bulkPriority = async (value: string) => {
    try {
      await Promise.all(selected.map((id) => patchTask(id, { priority: value })))
    } catch (error) {
      console.error('Error updating priority:', error)
    }
    setSelected([])
    loadTasks(true)
  }

  const bulkDelete = async () => {
    if (!(await confirm({ title: t('confirmBulkDelete', { count: selected.length }), confirmLabel: t('delete') }))) return
    try {
      await fetch(`/api/tasks?bulkIds=${selected.join(',')}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Error deleting tasks:', error)
    }
    setSelected([])
    loadTasks(true)
  }

  // ---- derived data ----------------------------------------------------

  const today = todayKey()

  const base = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    return tasks.filter((task) => {
      if (projectId && task.project_id !== projectId) return false
      if (assigneeId && task.assignee_id !== assigneeId) return false
      if (priority && task.priority !== priority) return false
      if (!query) return true
      return (
        task.title.toLowerCase().includes(query) ||
        (task.description || '').toLowerCase().includes(query) ||
        (task.tags || []).some((tag) => tag.toLowerCase().includes(query))
      )
    })
  }, [tasks, debouncedSearch, projectId, assigneeId, priority])

  const counts = useMemo(() => {
    const result = {} as Record<ViewId, number>
    for (const item of VIEWS) {
      result[item.id] = base.filter((task) => matchesView(task, item.id, currentUserId, today)).length
    }
    return result
  }, [base, currentUserId, today])

  const projectCounts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const task of tasks) {
      if (task.project_id && !isDone(task)) result[task.project_id] = (result[task.project_id] || 0) + 1
    }
    return result
  }, [tasks])

  const visible = useMemo(
    () => base.filter((task) => matchesView(task, view, currentUserId, today)).sort(compareTasks),
    [base, view, currentUserId, today]
  )

  const openCount = useMemo(() => tasks.filter((task) => !isDone(task)).length, [tasks])
  const overdueCount = useMemo(
    () => tasks.filter((task) => matchesView(task, 'overdue', currentUserId, today)).length,
    [tasks, currentUserId, today]
  )

  const groups = useMemo<Group[]>(() => {
    const active = visible.filter((task) => !isDone(task))
    const finished = visible.filter((task) => isDone(task))
    const result: Group[] = []

    if (groupBy === 'due') {
      const weekEnd = todayKey(7)
      const buckets: Record<string, Task[]> = { overdue: [], today: [], tomorrow: [], week: [], later: [], none: [] }
      const tomorrow = todayKey(1)
      for (const task of active) {
        const due = dayKey(task.due_date)
        if (!due) buckets.none.push(task)
        else if (due < today) buckets.overdue.push(task)
        else if (due === today) buckets.today.push(task)
        else if (due === tomorrow) buckets.tomorrow.push(task)
        else if (due <= weekEnd) buckets.week.push(task)
        else buckets.later.push(task)
      }
      const labels: [string, string, Group['tone']?][] = [
        ['overdue', t('groupOverdue'), 'danger'],
        ['today', t('today'), 'primary'],
        ['tomorrow', t('tomorrow')],
        ['week', t('groupNextDays')],
        ['later', t('groupLater')],
        ['none', t('groupNoDate')],
      ]
      for (const [key, label, tone] of labels) {
        if (buckets[key].length) result.push({ key, label, tone, tasks: buckets[key] })
      }
    } else if (groupBy === 'project') {
      const byProject = new Map<string, Task[]>()
      for (const task of active) {
        const key = task.project?.name || ''
        byProject.set(key, [...(byProject.get(key) || []), task])
      }
      const names = Array.from(byProject.keys()).sort((a, b) => {
        if (!a) return 1
        if (!b) return -1
        return a.localeCompare(b)
      })
      for (const name of names) {
        result.push({ key: `project:${name}`, label: name || t('noProject'), tasks: byProject.get(name)! })
      }
    } else if (active.length) {
      result.push({ key: 'all', label: '', tasks: active })
    }

    if (finished.length) {
      result.push({
        key: 'completed',
        label: t('groupCompleted'),
        tasks: finished,
        collapsible: view !== 'done',
      })
    }
    return result
  }, [visible, groupBy, view, today, t])

  const orderedIds = useMemo(
    () =>
      groups.flatMap((group) =>
        group.collapsible && !completedOpen ? [] : group.tasks.map((task) => task.id)
      ),
    [groups, completedOpen]
  )

  const openTask = openId ? tasks.find((task) => task.id === openId) || null : null
  const activeFilterCount = (projectId ? 1 : 0) + (assigneeId ? 1 : 0) + (priority ? 1 : 0)
  const hasFilters = activeFilterCount > 0 || !!searchQuery.trim()

  const clearFilters = () => {
    setProjectId('')
    setAssigneeId('')
    setPriority('')
    setSearchQuery('')
  }

  const startCreate = (initial?: QuickTaskInitial) => {
    setCreateInitial(initial)
    setCreateOpen(true)
  }

  const formatDay = (key: string) => format.dateTime(parseDayKey(key), { month: 'short', day: 'numeric' })

  const taskDetail = (task: Task) => {
    const due = dayKey(task.due_date)
    let dueText = ''
    if (due) dueText = due === today ? t('today') : due === todayKey(1) ? t('tomorrow') : formatDay(due)
    return [dueText, task.project?.name, priorityLabel(t, task.priority), task.assignee?.username]
      .filter(Boolean)
      .join(' · ')
  }

  // ---- keyboard --------------------------------------------------------

  const listActive = effectiveMode === 'list' && isMd
  const keyState = useRef({ orderedIds, cursorId, openId, listActive, is2xl, tasks })
  keyState.current = { orderedIds, cursorId, openId, listActive, is2xl, tasks }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      const state = keyState.current

      if (target?.closest('[data-task-panel]')) {
        if (event.key === 'Escape' && state.is2xl) setOpenId(null)
        return
      }

      if (event.key === '/') {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (event.key === 'n') {
        event.preventDefault()
        startCreate()
        return
      }
      if (!state.listActive) return

      const ids = state.orderedIds
      const move = (delta: number) => {
        if (!ids.length) return
        const index = state.cursorId ? ids.indexOf(state.cursorId) : -1
        const next = ids[Math.max(0, Math.min(ids.length - 1, index === -1 ? 0 : index + delta))]
        setCursorId(next)
        if (state.is2xl && state.openId) setOpenId(next)
        document.querySelector(`[data-task-id="${next}"]`)?.scrollIntoView({ block: 'nearest' })
      }

      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault()
        move(1)
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault()
        move(-1)
      } else if (event.key === 'Enter' || event.key === 'o') {
        if (target?.closest('button, a')) return
        if (state.cursorId) {
          event.preventDefault()
          setOpenId(state.cursorId)
        }
      } else if (event.key === 'x') {
        const task = state.tasks.find((item) => item.id === state.cursorId)
        if (task) {
          event.preventDefault()
          toggleComplete(task)
        }
      } else if (event.key === 'Escape') {
        if (state.openId) setOpenId(null)
        else setCursorId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // handlers read the latest values through refs / stable setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- render ----------------------------------------------------------

  const detailPanel = openTask ? (
    <TaskDetailPanel
      key={openTask.id}
      task={openTask}
      workspaceId={workspaceId}
      projects={projects}
      members={members}
      currentUserId={currentUserId}
      onChange={replaceTask}
      onDelete={removeTask}
      onClose={() => setOpenId(null)}
    />
  ) : null

  const filters = (variant: 'rail' | 'sheet') => (
    <TaskFilters
      variant={variant}
      view={view}
      onView={setView}
      counts={counts}
      projects={projects}
      projectCounts={projectCounts}
      projectId={projectId}
      onProject={setProjectId}
      members={members}
      assigneeId={assigneeId}
      onAssignee={setAssigneeId}
      currentUserId={currentUserId}
      priority={priority}
      onPriority={setPriority}
      onClear={clearFilters}
      hasFilters={activeFilterCount > 0}
    />
  )

  const modes = [
    { mode: 'list' as const, label: t('list'), Icon: List },
    { mode: 'board' as const, label: t('board'), Icon: LayoutGrid },
    { mode: 'calendar' as const, label: t('calendar'), Icon: CalendarDays },
  ].filter((item) => !(item.mode === 'board' && !isMd))

  const renderGroup = (group: Group) => {
    const collapsed = !!group.collapsible && !completedOpen
    return (
      <section key={group.key} aria-label={group.label || undefined}>
        {group.label ? (
          group.collapsible ? (
            <button
              type="button"
              aria-expanded={!collapsed}
              onClick={() => setCompletedOpen((open) => !open)}
              className="flex w-full items-center gap-1.5 rounded-lg px-1 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:px-3"
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {group.label}
              <span className="tabular-nums">{group.tasks.length}</span>
            </button>
          ) : (
            <h3
              className={`flex items-center gap-2 px-1 py-2 text-xs font-semibold uppercase tracking-wide md:px-3 ${
                group.tone === 'danger'
                  ? 'text-danger'
                  : group.tone === 'primary'
                    ? 'text-primary'
                    : 'text-text-muted'
              }`}
            >
              {group.label}
              <span className="tabular-nums text-text-muted">{group.tasks.length}</span>
            </h3>
          )
        ) : null}

        {collapsed ? null : isMd ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {group.tasks.map((task) => (
              <TaskListRow
                key={task.id}
                task={task}
                cursor={cursorId === task.id}
                open={openId === task.id}
                checked={selected.includes(task.id)}
                selecting={selected.length > 0}
                onOpen={() => {
                  setCursorId(task.id)
                  setOpenId(task.id)
                }}
                onToggle={() => toggleComplete(task)}
                onCheck={(checked) =>
                  setSelected((prev) => (checked ? [...prev, task.id] : prev.filter((id) => id !== task.id)))
                }
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                title={task.title}
                detail={taskDetail(task)}
                done={isDone(task)}
                completeLabel={t('markComplete')}
                deleteLabel={t('delete')}
                onOpen={() => setOpenId(task.id)}
                onToggle={() => toggleComplete(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </div>
        )}
      </section>
    )
  }

  let content: React.ReactNode
  if (loading) {
    content = (
      <div className="space-y-2" aria-busy="true" aria-label={t('loadingTasks')}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-11 animate-pulse rounded-lg bg-surface-hover" />
        ))}
      </div>
    )
  } else if (loadFailed && tasks.length === 0) {
    content = (
      <EmptyState
        title={t('loadFailed')}
        action={
          <Button type="button" variant="secondary" onClick={() => loadTasks()}>
            {t('retry')}
          </Button>
        }
      />
    )
  } else if (tasks.length === 0) {
    content = (
      <EmptyState
        title={t('noTasksYet')}
        body={t('createFirstTask')}
        action={
          <Button type="button" onClick={() => startCreate()} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('newTask')}
          </Button>
        }
      />
    )
  } else if (effectiveMode === 'board') {
    content = (
      <div className="lg:h-full lg:min-h-0">
        <KanbanBoard
          tasks={visible}
          selectedId={openId}
          onTaskClick={(task) => setOpenId(task.id)}
          onTaskUpdate={(id, updates) => (updates.status ? moveTask(id, updates.status) : undefined)}
        />
      </div>
    )
  } else if (effectiveMode === 'calendar') {
    content = (
      <div className="lg:h-full lg:min-h-0">
        <CalendarView
          tasks={visible}
          onTaskClick={(task) => setOpenId(task.id)}
          onDateSelect={(start) => startCreate({ due_date: toDayKey(start) })}
        />
      </div>
    )
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        title={t('noTasksFound')}
        body={hasFilters || view !== 'all' ? t('noTasksFoundHint') : undefined}
        action={
          hasFilters || view !== 'all' ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                clearFilters()
                setView('all')
              }}
            >
              {t('clearFilters')}
            </Button>
          ) : undefined
        }
      />
    )
  } else {
    content = <div className="space-y-3">{groups.map(renderGroup)}</div>
  }

  return (
    <PageFill>
      <PageHeader
        title={t('title')}
        description={
          loading || tasks.length === 0 ? undefined : t('summary', { open: openCount, overdue: overdueCount })
        }
        action={
          <div className="flex items-center gap-1">
            <Button type="button" aria-label={t('newTask')} onClick={() => startCreate()} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('newTask')}</span>
            </Button>
            <IconMenu
              label={t('moreActions')}
              items={[{ label: t('fromTemplate'), onClick: () => setTemplatesOpen(true) }]}
            />
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[11rem] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            ref={searchRef}
            type="search"
            placeholder={t('searchTasks')}
            aria-label={t('searchTasks')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>

        <div role="group" aria-label={t('viewMode')} className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          {modes.map(({ mode: item, label, Icon }) => (
            <button
              key={item}
              type="button"
              aria-pressed={effectiveMode === item}
              onClick={() => setMode(item)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-3 ${
                effectiveMode === item
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sr-only sm:hidden">{label}</span>
            </button>
          ))}
        </div>

        {effectiveMode === 'list' ? (
          <select
            aria-label={t('groupBy')}
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value as GroupBy)}
            className={`${selectClass} hidden md:block`}
          >
            <option value="due">{t('groupByDue')}</option>
            <option value="project">{t('groupByProject')}</option>
            <option value="none">{t('groupByNone')}</option>
          </select>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          className="gap-2 xl:hidden"
          onClick={() => setFiltersOpen(true)}
        >
          <ListFilter className="h-4 w-4" />
          {t('filters')}
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 xl:hidden" role="group" aria-label={t('views')}>
        {VIEWS.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              view === id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            {t(labelKey)}
            <span
              className={`tabular-nums ${
                id === 'overdue' && counts.overdue > 0 && view !== id ? 'font-semibold text-danger' : 'text-text-muted'
              }`}
            >
              {counts[id]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <aside
          aria-label={t('filters')}
          className="hidden w-56 shrink-0 xl:block xl:overflow-y-auto xl:pr-1"
        >
          {filters('rail')}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {selected.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
              <span className="text-sm font-medium text-text-primary">
                {t('tasksSelected', { count: selected.length })}
              </span>
              {selected.length < visible.length ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(visible.map((task) => task.id))}>
                  {t('selectAll')}
                </Button>
              ) : null}
              <span className="flex-1" />
              <Button type="button" size="sm" variant="secondary" onClick={bulkComplete}>
                {t('complete')}
              </Button>
              <select
                aria-label={t('changePriority')}
                defaultValue=""
                onChange={(event) => {
                  if (!event.target.value) return
                  bulkPriority(event.target.value)
                  event.target.value = ''
                }}
                className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-text-primary focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <option value="">{t('changePriority')}</option>
                <option value="urgent">{t('priorityUrgent')}</option>
                <option value="high">{t('priorityHigh')}</option>
                <option value="medium">{t('priorityMedium')}</option>
                <option value="low">{t('priorityLow')}</option>
              </select>
              <Button type="button" size="sm" variant="danger" onClick={bulkDelete}>
                {t('delete')}
              </Button>
              <button
                type="button"
                aria-label={t('clearSelection')}
                title={t('clearSelection')}
                onClick={() => setSelected([])}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1">{content}</div>

          {effectiveMode === 'list' && isMd && !loading && visible.length > 0 ? (
            <p className="hidden shrink-0 text-xs text-text-muted xl:block">{t('shortcutsHint')}</p>
          ) : null}
        </div>

        {is2xl && (openTask || effectiveMode === 'list') ? (
          <aside
            aria-label={t('details')}
            className="hidden min-h-0 w-[440px] shrink-0 overflow-hidden rounded-xl border border-border bg-surface 2xl:flex"
          >
            {detailPanel || (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-text-muted">
                {t('selectTaskHint')}
              </div>
            )}
          </aside>
        ) : null}
      </div>

      {openTask && !is2xl ? (
        <DetailSheet label={openTask.title} onClose={() => setOpenId(null)}>
          {detailPanel}
        </DetailSheet>
      ) : null}

      <Dialog open={filtersOpen} title={t('filters')} onClose={() => setFiltersOpen(false)}>
        {filters('sheet')}
      </Dialog>

      <AnimatePresence>
        {templatesOpen && (
          <TemplateSelector
            workspaceId={workspaceId}
            onClose={() => setTemplatesOpen(false)}
            onSelectTemplate={(data) => {
              const checklist = (data.subtasks || [])
                .filter((subtask) => subtask.title)
                .map((subtask) => `- [ ] ${subtask.title}`)
                .join('\n')
              startCreate({
                title: data.title,
                description: [data.description, checklist].filter(Boolean).join('\n\n'),
                priority: data.priority,
                category: data.category,
                estimated_hours: data.estimated_hours,
                tags: data.tags,
              })
              setTemplatesOpen(false)
            }}
          />
        )}
      </AnimatePresence>

      <QuickTaskForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initial={createInitial}
        defaultProjectId={projectId || undefined}
      />
      {dialog}
    </PageFill>
  )
}
