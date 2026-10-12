'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { localDateString } from '@/lib/date'
import { Clock, FileText, Plus, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { TaskRow } from '@/components/ui/TaskRow'
import Link from 'next/link'
import { addDays, isValid, startOfDay } from 'date-fns'
import { useTimerStore } from '@/stores/useTimerStore'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'

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

// Duplicate Task type trimmed; using the above definition
export default function Dashboard() {
  const t = useTranslations('pages.home')
  const tTasks = useTranslations('pages.tasks')
  const { confirm, dialog } = useConfirm()
  const format = useFormatter()
  const { workspaces, currentWorkspace, fetchWorkspaces, loading } = useWorkspaceStore()

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
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [quickProjectId, setQuickProjectId] = useState('')
  const [quickAssigneeId, setQuickAssigneeId] = useState('')
  const [mounted, setMounted] = useState(false)
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

    const init = async () => {
      if (workspaces.length === 0) await fetchWorkspaces()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
        if (profile?.username) setUserName(profile.username)
      }
    }
    init()
  }, [fetchWorkspaces, workspaces.length])

  // Fetch Dashboard Data
  useEffect(() => {
    if (!currentWorkspace) return

    const fetchData = async () => {
      // 1. Tasks - Correctly handling status/completion
      // We explicitly look for tasks that are not marked as completed
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*, project:projects(name, color), assignee:profiles!tasks_assignee_id_fkey(id, username)')
        .eq('workspace_id', currentWorkspace.id)
        .neq('is_completed', true)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(40)
      
      if (tasksData) setTasks(tasksData)
      if (tasksError) console.error('Error fetching tasks:', tasksError)

      // 2. Projects
      const projectsResponse = await fetch(`/api/projects?workspace_id=${currentWorkspace.id}`)
      let projectsData: any[] = []
      if (projectsResponse.ok) {
        const projectsJson = await projectsResponse.json()
        projectsData = projectsJson.projects || []
        const activeProjects = projectsData.filter((p: any) => p.status === 'active').slice(0, 8)
        setProjects(activeProjects)
      } else {
        console.error('Error fetching projects:', await projectsResponse.text())
        setProjects([])
      }

      // Team members for quick assignment
      const teamResponse = await fetch(`/api/team?workspace_id=${currentWorkspace.id}`)
      const teamJson = await teamResponse.json()
      if (teamResponse.ok) {
        const members = teamJson.members?.map((m: any) => ({
          id: m.profiles?.id || m.user_id,
          username: m.profiles?.username || 'unknown'
        })) || []
        setTeamMembers(members)
      }

      // 3. Notes - Using !inner join to filter by workspace via projects
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*, project:projects!inner(workspace_id)')
        .eq('project.workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(3)
        
      if (notesData) setNotes(notesData)
      if (notesError) console.error('Error fetching notes:', notesError)

      // 4. Stats Calculations
      // Tasks Due (Not completed)
      const { count: dueCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .neq('is_completed', true)

      // Tasks Completed
      const { count: completedCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_completed', true)

      // Active Projects
      const activeProjectsCount = projectsData.filter((p: any) => p.status === 'active').length
      
      // Time Logged - Fetch today's entries
      const today = localDateString()
      
      const { data: timeData } = await supabase
        .from('time_entries')
        .select('duration')
        .eq('workspace_id', currentWorkspace.id)
        .eq('date', today)
      
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
  // Only the workspace id matters: the store hands out a fresh object on every refresh, which would refetch needlessly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !currentWorkspace) return

    const { data: authData } = await supabase.auth.getUser()
    const currentUserId = authData.user?.id

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
    } else if (error) {
        console.error('Error creating task:', error)
    }
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

  if (!mounted) return null

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

  if (!currentWorkspace) return <p className="py-12 text-center text-sm text-text-muted">{t('loadingWorkspace')}</p>

  const fieldClass =
    'w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

  const linkClass =
    'rounded text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  const groupDefs = [
    { key: 'overdue' as const, label: t('groupOverdue'), tone: 'text-danger' },
    { key: 'today' as const, label: t('groupToday'), tone: 'text-text-primary' },
    { key: 'upcoming' as const, label: t('groupUpcoming'), tone: 'text-text-primary' },
    { key: 'noDate' as const, label: t('groupNoDate'), tone: 'text-text-secondary' },
  ]

  const cardClass = 'rounded-xl border border-border bg-surface'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t(greetingKey)}, ${userName || t('there')}`}
        description={t('doneLeft', { done: stats.tasksCompleted, left: stats.tasksRemaining })}
      />

      <form
        onSubmit={handleCreateTask}
        aria-label={t('quickAddLabel')}
        className={`${cardClass} grid grid-cols-2 gap-2 p-2 sm:flex sm:items-center`}
      >
        <input
          type="text"
          aria-label={t('quickAddLabel')}
          placeholder={t('taskPlaceholder')}
          className={`${fieldClass} col-span-2 min-w-0 sm:flex-1`}
          value={newTaskTitle}
          onChange={(event) => setNewTaskTitle(event.target.value)}
        />
        {projects.length > 0 && (
          <select
            aria-label={t('project')}
            value={quickProjectId}
            onChange={(event) => setQuickProjectId(event.target.value)}
            className={`${fieldClass} min-w-0 sm:w-44 xl:w-52`}
          >
            <option value="">{t('selectProject')}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        )}
        {teamMembers.length > 0 && (
          <select
            aria-label={t('assignee')}
            value={quickAssigneeId}
            onChange={(event) => setQuickAssigneeId(event.target.value)}
            className={`${fieldClass} min-w-0 sm:w-40 xl:w-48`}
          >
            <option value="">{t('assignToMe')}</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.username === 'unknown' ? t('unknownUser') : member.username}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" disabled={!newTaskTitle.trim()} className="col-span-2 shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          {t('addTask')}
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
        <section className="min-w-0 space-y-5 xl:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">{t('tasksOpen')}</h2>
            <Link href="/dashboard/tasks" className={linkClass}>{t('viewAll')}</Link>
          </div>
          {tasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
              {t('allCaughtUp')}
            </p>
          ) : (
            groupDefs.map(({ key, label, tone }) =>
              taskGroups[key].length === 0 ? null : (
                <div key={key} className="space-y-2">
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
                      />
                    ))}
                  </div>
                </div>
              )
            )
          )}
        </section>

        <div className="grid min-w-0 content-start gap-6 md:grid-cols-2 xl:col-span-4 xl:grid-cols-1">
          <section className={`${cardClass} flex items-center gap-3 px-4 py-3 md:col-span-2 xl:col-span-1`}>
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
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => stopTimer()}>
                <Square className="h-3 w-3" />
                {t('stopTimer')}
              </Button>
            ) : (
              <Link href="/dashboard/time-tracker" className={`shrink-0 ${linkClass}`}>
                {t('openTimer')}
              </Link>
            )}
          </section>

          <section className="min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">{t('activeProjects')}</h2>
              <Link href="/dashboard/projects" className={linkClass}>{t('viewAll')}</Link>
            </div>
            {projects.length === 0 ? (
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
            {notes.length === 0 ? (
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
