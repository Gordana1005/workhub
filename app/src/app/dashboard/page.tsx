'use client'

import { useEffect, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { TaskRow } from '@/components/ui/TaskRow'
import Link from 'next/link'
import { isValid } from 'date-fns'
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
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (tasksData) setTasks(tasksData)
      if (tasksError) console.error('Error fetching tasks:', tasksError)

      // 2. Projects
      const projectsResponse = await fetch(`/api/projects?workspace_id=${currentWorkspace.id}`)
      let projectsData: any[] = []
      if (projectsResponse.ok) {
        const projectsJson = await projectsResponse.json()
        projectsData = projectsJson.projects || []
        const activeProjects = projectsData.filter((p: any) => p.status === 'active').slice(0, 4)
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
      const today = new Date().toISOString().split('T')[0]
      
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
  }, [currentWorkspace])

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
      due_date: new Date().toISOString(),
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
    if (!confirm(tTasks('confirmDeleteTask'))) return
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
    return format.relativeTime(date)
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t(greetingKey)}, ${userName || t('there')}`}
        description={t('doneLeft', { done: stats.tasksCompleted, left: stats.tasksRemaining })}
      />

      <form onSubmit={handleCreateTask} className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <input
          type="text"
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
            className={`${fieldClass} min-w-0 sm:w-44`}
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
            className={`${fieldClass} min-w-0 sm:w-40`}
          >
            <option value="">{t('assignToMe')}</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.username === 'unknown' ? t('unknownUser') : member.username}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" disabled={!newTaskTitle.trim()} className="col-span-2 shrink-0">
          {t('addTask')}
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <section className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">{t('myTasks')}</h2>
            <Link href="/dashboard/tasks" className="text-sm text-primary">{t('viewAll')}</Link>
          </div>
          {tasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
              {t('allCaughtUp')}
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
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
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">{t('recentNotes')}</h2>
            <Link href="/dashboard/notes" className="text-sm text-primary">{t('viewAll')}</Link>
          </div>
          {notes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
              {t('noRecentNotes')}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {notes.map((note) => (
                <Link
                  key={note.id}
                  href="/dashboard/notes"
                  className="block min-w-0 rounded-xl border border-border bg-surface px-3 py-3 hover:border-primary/40"
                >
                  <p className="truncate text-sm font-medium text-text-primary">{note.title || t('untitledNote')}</p>
                  <p className="mt-1 text-xs text-text-muted">{t('updated', { time: relativeTime(note.created_at) })}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
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
    </div>
  )
}
