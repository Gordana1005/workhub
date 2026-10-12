'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { localDateString } from '@/lib/date'
import { getMyProfile, getSessionUserId } from '@/lib/auth-client'
import { getJsonCached } from '@/lib/api-cache'
import { CheckCircle2, ChevronDown, Clock, FileText, Plus, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { TaskRow } from '@/components/ui/TaskRow'
import Link from 'next/link'
import { addDays, isValid, startOfDay } from 'date-fns'
import { useTimerStore } from '@/stores/useTimerStore'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import SubtaskChip from '@/components/tasks/SubtaskChip'
import { fetchSubtaskCounts, runTopLevel, withSubtaskCounts } from '@/lib/subtasks'
import GettingStarted from '@/components/onboarding/GettingStarted'
import FirstProjectHero from '@/components/onboarding/FirstProjectHero'

// Types
interface Task {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  status: string
  is_completed: boolean
  category?: string | null
  project?: { name: string; color: string }
  assignee?: { id: string; username: string }
  subtask_total?: number
  subtask_done?: number
}

interface Project {
  id: string
  name: string
  status: string
  color: string
  end_date?: string | null
  taskCount?: number
  completedTaskCount?: number
}

interface Note {
  id: string
  title: string | null
  created_at: string
}

interface DashboardStats {
  tasksDue: number
  tasksCompleted: number
  timeLogged: number
  activeProjects: number
  completionRate: number
  tasksRemaining: number
}

// Layout-shaped placeholder (no spinners): same blocks as the real page so nothing jumps when data lands.
function TaskRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="space-y-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3">
          <Skeleton className="h-5 w-5 shrink-0 !rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="space-y-2 px-4 py-3">
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

function HomeSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="space-y-2">
        <Skeleton className="h-7 w-2/3 max-w-sm" />
        <Skeleton className="h-4 w-1/3 max-w-xs" />
      </div>
      <Skeleton className="h-[7.25rem] w-full !rounded-xl sm:h-14" />
      <TaskRowsSkeleton />
    </div>
  )
}

// Duplicate Task type trimmed; using the above definition
export default function Dashboard() {
  const t = useTranslations('pages.home')
  const tTasks = useTranslations('pages.tasks')
  const { confirm, dialog } = useConfirm()
  const format = useFormatter()
  const { workspaces, currentWorkspace, loading } = useWorkspaceStore()

  const [userName, setUserName] = useState('')
  const [greetingKey, setGreetingKey] = useState<'greetingMorning' | 'greetingAfternoon' | 'greetingEvening'>('greetingAfternoon')
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [teamMembers, setTeamMembers] = useState<{ id: string; username: string }[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    tasksDue: 0,
    tasksCompleted: 0,
    timeLogged: 0,
    activeProjects: 0,
    completionRate: 0,
    tasksRemaining: 0
  })
  // Total projects (any status); null until the projects request has succeeded. Drives first-run onboarding.
  const [projectTotal, setProjectTotal] = useState<number | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const silentReload = useRef(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [quickProjectId, setQuickProjectId] = useState('')
  const [quickAssigneeId, setQuickAssigneeId] = useState('')
  const [mounted, setMounted] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const quickInputRef = useRef<HTMLInputElement>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const { time: timerTime, isRunning: timerRunning, stop: stopTimer } = useTimerStore()

  // Hydration fix & Initial Data Load
  useEffect(() => {
    setMounted(true)
    const hour = new Date().getHours()
    if (hour < 12) setGreetingKey('greetingMorning')
    else if (hour < 18) setGreetingKey('greetingAfternoon')
    else setGreetingKey('greetingEvening')

    // Workspaces are fetched once by the dashboard layout; the greeting name comes from the shared profile lookup
    let active = true
    getMyProfile().then((profile) => {
      if (active && profile?.username) setUserName(profile.username)
    })
    return () => {
      active = false
    }
  }, [])

  // Fetch Dashboard Data
  useEffect(() => {
    if (!currentWorkspace) return

    let cancelled = false
    // A task created elsewhere (New menu, onboarding checklist) refetches without flashing the skeleton
    const silent = silentReload.current
    silentReload.current = false
    if (!silent) {
      setDataLoading(true)
      setProjectTotal(null)
    }

    const fetchData = async () => {
      const workspaceId = currentWorkspace.id
      const today = localDateString()

      // Everything on this screen is independent: start it all at once instead of one request after
      // another, then paint when the slowest has landed.
      const tasksPromise = (async () => {
        // Tasks that are not completed (top-level only: subtasks live inside their parent and show
        // up as an x/y chip). The subtask counts do not depend on the list, so they run alongside.
        const [{ data: tasksData, error: tasksError }, subtaskCounts] = await Promise.all([
          runTopLevel((topLevel) => {
            let q = supabase
              .from('tasks')
              .select('*, project:projects(name, color), assignee:profiles!tasks_assignee_id_fkey(id, username)')
              .eq('workspace_id', workspaceId)
              .neq('is_completed', true)
              .order('due_date', { ascending: true, nullsFirst: false })
              .limit(40)
            if (topLevel) q = q.is('parent_task_id', null)
            return q
          }),
          fetchSubtaskCounts(supabase, { workspaceId }),
        ])
        if (tasksError) console.error('Error fetching tasks:', tasksError)
        return tasksData ? withSubtaskCounts(tasksData, subtaskCounts) : null
      })()

      const projectsPromise = getJsonCached<any>(`/api/projects?workspace_id=${workspaceId}`).then(
        (json) => ({ ok: true as const, projects: (json?.projects || []) as any[] }),
        (error) => {
          console.error('Error fetching projects:', error)
          return { ok: false as const, projects: [] as any[] }
        }
      )

      // Team members for quick assignment
      const teamPromise = getJsonCached<any>(`/api/team?workspace_id=${workspaceId}`).then(
        (json) =>
          (json?.members?.map((m: any) => ({
            id: m.profiles?.id || m.user_id,
            username: m.profiles?.username || 'unknown'
          })) || []) as { id: string; username: string }[],
        () => null
      )

      // Notes - Using !inner join to filter by workspace via projects
      const notesPromise = Promise.resolve(
        supabase
          .from('notes')
          .select('*, project:projects!inner(workspace_id)')
          .eq('project.workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(3)
      )

      // Stats: tasks due (not completed) / completed (top-level only)
      const countTasks = (completed: boolean) =>
        runTopLevel((topLevel) => {
          let q = supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId)
          q = completed ? q.eq('is_completed', true) : q.neq('is_completed', true)
          if (topLevel) q = q.is('parent_task_id', null)
          return q
        })
      const duePromise = countTasks(false)
      const completedPromise = countTasks(true)

      // Time logged today
      const timePromise = Promise.resolve(
        supabase.from('time_entries').select('duration').eq('workspace_id', workspaceId).eq('date', today)
      )

      const [tasksResult, projectsResult, teamResult, { data: notesData, error: notesError }, { count: dueCount }, { count: completedCount }, { data: timeData }] =
        await Promise.all([tasksPromise, projectsPromise, teamPromise, notesPromise, duePromise, completedPromise, timePromise])

      if (tasksResult) setTasks(tasksResult)

      const projectsData = projectsResult.projects
      if (projectsResult.ok) {
        setProjectTotal(projectsData.length)
        setProjects(projectsData.filter((p: any) => p.status === 'active').slice(0, 8))
      } else {
        setProjects([])
      }

      if (teamResult) setTeamMembers(teamResult)

      if (notesData) setNotes(notesData)
      if (notesError) console.error('Error fetching notes:', notesError)

      const activeProjectsCount = projectsData.filter((p: any) => p.status === 'active').length
      const secondsToday = timeData?.reduce((acc, curr) => acc + curr.duration, 0) || 0

      const totalTasks = (dueCount || 0) + (completedCount || 0)
      const completionRate = totalTasks > 0
        ? Math.round(((completedCount || 0) / totalTasks) * 100)
        : 0

      setStats({
        tasksDue: dueCount || 0,
        tasksCompleted: completedCount || 0,
        timeLogged: secondsToday,
        activeProjects: activeProjectsCount || 0,
        completionRate,
        tasksRemaining: dueCount || 0
      })
    }

    fetchData()
      .catch((error) => console.error('Error loading dashboard:', error))
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  // Only the workspace id matters: the store hands out a fresh object on every refresh, which would refetch needlessly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id, reloadTick])

  useEffect(() => {
    const onTaskCreated = () => {
      silentReload.current = true
      setReloadTick((tick) => tick + 1)
    }
    window.addEventListener('trackwork:task-created', onTaskCreated)
    return () => window.removeEventListener('trackwork:task-created', onTaskCreated)
  }, [])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !currentWorkspace || adding) return
    setAdding(true)

    const currentUserId = (await getSessionUserId()) || undefined

    // Create simple task
    const { data, error } = await supabase.from('tasks').insert({
      title: newTaskTitle,
      workspace_id: currentWorkspace.id,
      status: 'To Do',
      priority: 'medium',
      due_date: localDateString(),
      user_id: currentUserId,
      assignee_id: quickAssigneeId || currentUserId,
      project_id: quickProjectId || null,
      is_completed: false
    }).select('*, project:projects(name, color), assignee:profiles!tasks_assignee_id_fkey(id, username)').single()

    if (data) {
        setTasks([data, ...tasks])
        setNewTaskTitle('')
      // Keep quick selectors as-is so you can add multiple tasks; clear title only
      // and keep the keyboard up so the next one can be typed straight away
      quickInputRef.current?.focus()
    } else if (error) {
        console.error('Error creating task:', error)
    }
    setAdding(false)
  }

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    // Optimistic update (remove from quick list)
    setTasks(prev => prev.filter(t => t.id !== taskId))

    const response = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: taskId,
        is_completed: !currentStatus,
        status: !currentStatus ? 'Done' : 'To Do',
        completed_at: !currentStatus ? new Date().toISOString() : null
      })
    })

    if (!response.ok) {
      console.error('Error updating task:', await response.text())
      // Revert if failure
      setTasks(prev => prev)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!(await confirm({ title: tTasks('confirmDeleteTask'), confirmLabel: tTasks('deleteTask') }))) return
    const response = await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' })
    if (response.ok) {
      setTasks(prev => prev.filter(item => item.id !== taskId))
    } else {
      console.error('Error deleting task:', await response.text())
    }
  }

  const relativeTime = (dateString: string | null | undefined): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (!isValid(date)) return ''
    return format.relativeTime(date, new Date())
  }

  const priorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return t('priority.urgent')
      case 'high':
        return t('priority.high')
      case 'medium':
        return t('priority.medium')
      case 'low':
        return t('priority.low')
      default:
        return priority
    }
  }

  const taskGroups = useMemo(() => {
    const start = startOfDay(new Date())
    const end = addDays(start, 1)
    const groups: Record<'overdue' | 'today' | 'upcoming' | 'noDate', Task[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      noDate: [],
    }
    for (const task of tasks) {
      const due = task.due_date ? new Date(task.due_date) : null
      if (!due || !isValid(due)) groups.noDate.push(task)
      else if (due < start) groups.overdue.push(task)
      else if (due < end) groups.today.push(task)
      else groups.upcoming.push(task)
    }
    return groups
  }, [tasks])

  const formatDuration = (seconds: number) =>
    t('hoursMinutes', { hours: Math.floor(seconds / 3600), minutes: Math.floor((seconds % 3600) / 60) })

  if (!mounted) return <HomeSkeleton label={t('loadingWorkspace')} />

  if (!loading && workspaces.length === 0 && !currentWorkspace) {
    return (
      <EmptyState
        title={t('createFirstTitle')}
        body={t('createFirstBody')}
        action={
          <div className="flex flex-col items-center gap-3">
            <Link href="/dashboard/workspaces?create=true">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> {t('createWorkspace')}
              </Button>
            </Link>
            <Link href="/dashboard/workspaces" className="text-sm text-text-secondary hover:text-text-primary">
              {t('browseWorkspaces')}
            </Link>
          </div>
        }
      />
    )
  }

  if (!currentWorkspace) return <HomeSkeleton label={t('loadingWorkspace')} />

  // 44px touch target on phones, still reads as a quiet text link on desktop
  const linkClass =
    'inline-flex min-h-11 items-center rounded px-1 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-0'

  const groupDefs = [
    { key: 'overdue' as const, label: t('groupOverdue'), tone: 'text-danger' },
    { key: 'today' as const, label: t('groupToday'), tone: 'text-text-primary' },
    { key: 'upcoming' as const, label: t('groupUpcoming'), tone: 'text-text-primary' },
    { key: 'noDate' as const, label: t('groupNoDate'), tone: 'text-text-secondary' },
  ]

  const cardClass = 'rounded-xl border border-border bg-surface'

  // Phone: this chip sits right under the quick-add field; xl: it moves to the side column.
  const timerCard = (
    <section className={`${cardClass} flex items-center gap-3 px-4 py-3`}>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          timerRunning ? 'bg-primary/10 text-primary' : 'bg-surface-hover text-text-muted'
        }`}
      >
        <Clock className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {timerRunning ? t('timerRunning') : t('timerIdle')}
        </p>
        <p className="truncate text-xs text-text-muted">
          {t('timeToday')}: {formatDuration(stats.timeLogged + (timerRunning ? timerTime : 0))}
        </p>
      </div>
      {timerRunning ? (
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => stopTimer()}>
          <Square className="h-3 w-3" />
          {t('stopTimer')}
        </Button>
      ) : (
        <Link href="/dashboard/time-tracker" aria-label={t('openTimer')} className={`shrink-0 ${linkClass}`}>
            {t('start')}
          </Link>
      )}
    </section>
  )

  // Brand-new workspace: one friendly hero with the primary action instead of three empty boxes
  if (!dataLoading && projectTotal === 0 && tasks.length === 0 && stats.tasksDue + stats.tasksCompleted === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={`${t(greetingKey)}, ${userName || t('there')}`} />
        <FirstProjectHero />
        {dialog}
      </div>
    )
  }

  const dueNowCount = taskGroups.overdue.length + taskGroups.today.length
  const laterCount = taskGroups.upcoming.length + taskGroups.noDate.length

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t(greetingKey)}, ${userName || t('there')}`}
        description={t('doneLeft', { done: stats.tasksCompleted, left: stats.tasksRemaining })}
      />

      {!dataLoading && projectTotal !== null ? (
        <GettingStarted counts={{ projects: projectTotal, tasks: stats.tasksDue + stats.tasksCompleted, notes: notes.length }} />
      ) : null}

      <form
        onSubmit={handleCreateTask}
        aria-label={t('quickAddLabel')}
        className={`${cardClass} grid grid-cols-2 gap-2 p-2 sm:flex sm:items-center`}
      >
        <Input
          ref={quickInputRef}
          type="text"
          aria-label={t('quickAddLabel')}
          placeholder={t('taskPlaceholder')}
          className="col-span-2 min-w-0 sm:flex-1"
          enterKeyHint="done"
          autoComplete="off"
          autoCapitalize="sentences"
          value={newTaskTitle}
          onChange={(event) => setNewTaskTitle(event.target.value)}
        />
        {projects.length > 0 && (
          <Select
            aria-label={t('project')}
            value={quickProjectId}
            onChange={(event) => setQuickProjectId(event.target.value)}
            wrapperClassName="min-w-0 sm:w-44 xl:w-52"
          >
            <option value="">{t('selectProject')}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </Select>
        )}
        {teamMembers.length > 0 && (
          <Select
            aria-label={t('assignee')}
            value={quickAssigneeId}
            onChange={(event) => setQuickAssigneeId(event.target.value)}
            wrapperClassName="min-w-0 sm:w-40 xl:w-48"
          >
            <option value="">{t('assignToMe')}</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.username === 'unknown' ? t('unknownUser') : member.username}
              </option>
            ))}
          </Select>
        )}
        <Button type="submit" size="lg" disabled={!newTaskTitle.trim()} loading={adding} className="col-span-2 shrink-0 gap-1.5 sm:h-10 sm:w-auto sm:px-4">
          <Plus className="h-4 w-4" />
          {t('addTask')}
        </Button>
      </form>

      <div className="xl:hidden">{timerCard}</div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
        <section className="min-w-0 space-y-5 xl:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">{t('tasksOpen')}</h2>
            <Link href="/dashboard/tasks" className={linkClass}>{t('viewAll')}</Link>
          </div>
          {dataLoading && tasks.length === 0 ? (
            <div role="status" aria-busy="true">
              <span className="sr-only">{t('loadingWorkspace')}</span>
              <TaskRowsSkeleton />
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState compact icon={<CheckCircle2 />} title={t('allCaughtUp')} />
          ) : (
            groupDefs.map(({ key, label, tone }) =>
              taskGroups[key].length === 0 ? null : (
                <div
                  key={key}
                  className={`space-y-2 ${(key === 'upcoming' || key === 'noDate') && !showMore ? 'hidden md:block' : ''}`}
                >
                  <h3 className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${tone}`}>
                    {label}
                    <span className="rounded-full bg-surface-hover px-1.5 py-0.5 text-[11px] font-medium normal-case tracking-normal text-text-muted">
                      {taskGroups[key].length}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {taskGroups[key].map((task) => (
                      <TaskRow
                        key={task.id}
                        title={task.title}
                        done={task.is_completed}
                        completeLabel={tTasks('markComplete')}
                        deleteLabel={tTasks('delete')}
                        detail={[
                          task.project?.name,
                          task.category,
                          task.assignee?.username,
                          priorityLabel(task.priority),
                          relativeTime(task.due_date) || t('noDueDate'),
                        ].filter(Boolean).join(' · ')}
                        onOpen={() => {
                          setSelectedTask(task)
                          setShowTaskModal(true)
                        }}
                        onToggle={() => handleToggleTask(task.id, task.is_completed)}
                        onDelete={() => handleDeleteTask(task.id)}
                        meta={task.subtask_total ? <SubtaskChip total={task.subtask_total} done={task.subtask_done} /> : undefined}
                      />
                    ))}
                  </div>
                </div>
              )
            )
          )}
          {tasks.length > 0 && dueNowCount === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-text-muted md:hidden">
              {t('nothingDueNow')}
            </p>
          ) : null}
          {laterCount > 0 ? (
            <button
              type="button"
              aria-expanded={showMore}
              onClick={() => setShowMore((value) => !value)}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-text-secondary active:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
            >
              {showMore ? t('showLess') : t('showMoreTasks', { count: laterCount })}
              <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            </button>
          ) : null}
        </section>

        <div className="grid min-w-0 content-start gap-6 md:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
          <div className="hidden xl:block">{timerCard}</div>

          <section className="min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">{t('activeProjects')}</h2>
              <Link href="/dashboard/projects" className={linkClass}>{t('viewAll')}</Link>
            </div>
            {dataLoading && projects.length === 0 ? (
              <ListSkeleton />
            ) : projects.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
                {t('noActiveProjects')}
              </p>
            ) : (
              <ul className={`${cardClass} divide-y divide-border overflow-hidden`}>
                {projects.slice(0, 6).map((project) => {
                  const total = project.taskCount || 0
                  const done = project.completedTaskCount || 0
                  const percent = total > 0 ? Math.round((done / total) * 100) : 0
                  const due = project.end_date ? new Date(project.end_date) : null
                  const color = project.color || 'var(--brand-blue)'
                  return (
                    <li key={project.id}>
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="block min-w-0 px-4 py-3 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-2">
                          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{project.name}</span>
                          <span className="shrink-0 text-xs tabular-nums text-text-muted">{percent}%</span>
                        </div>
                        <div
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percent}
                          aria-label={project.name}
                          className="mt-2 h-1 overflow-hidden rounded-full bg-border"
                        >
                          <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
                        </div>
                        <p className="mt-1.5 truncate text-xs text-text-muted">
                          {total > 0 ? t('tasksProgress', { done, total }) : t('noTasksInProject')}
                          {due && isValid(due) ? ` · ${t('dueOn', { date: format.dateTime(due, { month: 'short', day: 'numeric' }) })}` : ''}
                        </p>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">{t('recentNotes')}</h2>
              <Link href="/dashboard/notes" className={linkClass}>{t('viewAll')}</Link>
            </div>
            {dataLoading && notes.length === 0 ? (
              <ListSkeleton rows={2} />
            ) : notes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
                {t('noRecentNotes')}
              </p>
            ) : (
              <ul className={`${cardClass} divide-y divide-border overflow-hidden`}>
                {notes.map((note) => (
                  <li key={note.id}>
                    <Link
                      href="/dashboard/notes"
                      className="flex min-w-0 items-center gap-3 px-4 py-3 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text-primary">{note.title || t('untitledNote')}</span>
                        <span className="block truncate text-xs text-text-muted">{t('updated', { time: relativeTime(note.created_at) })}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {showTaskModal && selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            workspaceId={currentWorkspace?.id || ''}
            onClose={() => {
              setShowTaskModal(false)
              setSelectedTask(null)
            }}
            onUpdate={(updatedTask) => {
              setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
            }}
            onDelete={(taskId) => {
              setTasks(prev => prev.filter(t => t.id !== taskId))
              setShowTaskModal(false)
              setSelectedTask(null)
            }}
          />
        )}
      </AnimatePresence>
      {dialog}
    </div>
  )
}
