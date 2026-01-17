'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { useTimerStore } from '@/stores/useTimerStore'
import { supabase } from '@/lib/supabase'
import { 
  Clock, User, Calendar, 
  ArrowRight, CheckCircle2, AlertCircle, Zap, 
  Plus, Play, Pause, MoreHorizontal, FileText, Target,
  Check, Users
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { formatDistanceToNow, isValid } from 'date-fns'
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
const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const formatReadableDuration = (seconds: number) => {
  if (seconds <= 0) return '0m'
  const totalMinutes = Math.max(1, Math.floor(seconds / 60))
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

const safeDate = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (!isValid(date)) return ''
  return formatDistanceToNow(date, { addSuffix: true })
}

export default function Dashboard() {
  const { workspaces, currentWorkspace, fetchWorkspaces, loading } = useWorkspaceStore()
  const { time, isRunning, start, stop, tick } = useTimerStore()

  const [userName, setUserName] = useState('there')
  const [greeting, setGreeting] = useState('Good afternoon')
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [teamMembers, setTeamMembers] = useState<{ id: string; username: string }[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [categories, setCategories] = useState<{ name: string; color: string }[]>([])
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

  // Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      interval = setInterval(tick, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, tick])

  // Hydration fix & Initial Data Load
  useEffect(() => {
    setMounted(true)
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')

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

      // Categories for color lookup
      const catResponse = await fetch(`/api/task-categories?workspace_id=${currentWorkspace.id}`)
      const catJson = await catResponse.json()
      if (catResponse.ok) {
        setCategories(catJson.categories || [])
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

  if (!mounted) return null // Prevent hydration mismatch

  if (!loading && workspaces.length === 0 && !currentWorkspace) {
    return (
      <div className="max-w-3xl mx-auto py-16">
        <div className="bg-surface/60 border border-cyan-500/20 rounded-2xl p-10 text-center space-y-5 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
            <Zap className="w-4 h-4" /> Welcome to TrackWork
          </div>
          <h1 className="text-3xl font-bold text-white">Create your first workspace</h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            You are signed in and ready to go. Create a workspace to start projects, tasks, and notes. No workspace was created for you automatically.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard/workspaces?create=true">
              <Button className="bg-primary hover:bg-primary-hover text-white gap-2">
                <Plus className="w-4 h-4" /> Create workspace
              </Button>
            </Link>
            <Link href="/dashboard/workspaces">
              <Button variant="outline" className="gap-2">
                Browse workspaces
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!currentWorkspace) return <div className="p-8 text-center text-text-muted">Loading workspace...</div>

  const categoryColorMap = categories.reduce<Record<string, string>>((acc, cat) => {
    if (cat.name) acc[cat.name] = cat.color
    return acc
  }, {})

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white mb-1">{greeting}, {userName}</h1>
           <p className="text-text-secondary">Here's what's happening in your workspace today.</p>
        </div>
        <div className="flex items-center gap-3">
            <Link href="/dashboard/focus">
                <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary">
                    <Zap className="w-4 h-4" /> Focus Mode
                </Button>
            </Link>
            <Link href="/dashboard/projects">
                <Button className="bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4 mr-2" /> New Project
                </Button>
            </Link>
        </div>
      </div>

      {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card padding="md" className="bg-gradient-to-br from-surface/90 via-surface/80 to-surface/70 border-cyan-500/20 backdrop-blur-md shadow-[0_15px_40px_-18px_rgba(0,0,0,0.85)]">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/30 via-blue-500/15 to-blue-500/5 text-blue-100 shadow-inner ring-1 ring-blue-400/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-text-muted text-sm">Tasks</p>
              <p className="text-2xl font-bold text-white leading-tight">{stats.tasksDue}</p>
            </div>
          </div>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-surface/90 via-surface/80 to-surface/70 border-cyan-500/20 backdrop-blur-md shadow-[0_15px_40px_-18px_rgba(0,0,0,0.85)]">
           <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500/30 via-orange-500/15 to-orange-500/5 text-orange-100 shadow-inner ring-1 ring-orange-400/30">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-text-muted text-sm">Productive</p>
              <p className="text-2xl font-bold text-white leading-tight">{formatReadableDuration(stats.timeLogged)}</p>
            </div>
          </div>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-surface/90 via-surface/80 to-surface/70 border-cyan-500/20 backdrop-blur-md shadow-[0_15px_40px_-18px_rgba(0,0,0,0.85)]">
           <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/30 via-purple-500/15 to-purple-500/5 text-purple-100 shadow-inner ring-1 ring-purple-400/30">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-text-muted text-sm">Projects</p>
              <p className="text-2xl font-bold text-white leading-tight">{stats.activeProjects}</p>
            </div>
          </div>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-surface/90 via-surface/80 to-surface/70 border-cyan-500/20 backdrop-blur-md shadow-[0_15px_40px_-18px_rgba(0,0,0,0.85)]">
           <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500/30 via-green-500/15 to-green-500/5 text-green-100 shadow-inner ring-1 ring-green-400/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-text-muted text-sm">Team</p>
            <p className="text-2xl font-bold text-white leading-tight">{teamMembers.length}</p>
          </div>
          </div>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Quick Task Creator */}
            <Card className="border-primary/20 bg-surface/50">
                <form onSubmit={handleCreateTask} className="space-y-4 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 rounded-2xl border border-cyan-500/20 bg-surface/60 px-3 py-2">
                            <div className="p-2 rounded-xl bg-primary/15 text-primary">
                                <Plus className="w-5 h-5" />
                            </div>
                            <input 
                                type="text" 
                                placeholder="What needs to be done?"
                                className="flex-1 bg-transparent border-none text-base sm:text-lg text-white placeholder:text-text-muted focus:ring-0 focus:outline-none"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                            />
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!newTaskTitle}
                          className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-white transition-colors"
                        >
                          Add Task
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {projects.length > 0 && (
                          <label className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-surface/60 px-3 py-2 text-sm text-white/80">
                            <span className="text-[11px] uppercase tracking-wide text-text-muted">Project</span>
                            <select
                              value={quickProjectId}
                              onChange={(e) => setQuickProjectId(e.target.value)}
                              className="w-full bg-[var(--bg-secondary)] text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40 border border-[var(--border)] rounded-lg px-2 py-2 appearance-none"
                            >
                              <option value="">Select project</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </label>
                        )}
                        {teamMembers.length > 0 && (
                          <label className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-surface/60 px-3 py-2 text-sm text-white/80">
                            <span className="text-[11px] uppercase tracking-wide text-text-muted">Assignee</span>
                            <select
                              value={quickAssigneeId}
                              onChange={(e) => setQuickAssigneeId(e.target.value)}
                              className="w-full bg-[var(--bg-secondary)] text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40 border border-[var(--border)] rounded-lg px-2 py-2 appearance-none"
                            >
                              <option value="">Assign to me</option>
                              {teamMembers.map((m) => (
                                <option key={m.id} value={m.id}>{m.username}</option>
                              ))}
                            </select>
                          </label>
                        )}
                    </div>
                </form>
            </Card>

            {/* Recent Tasks */}
            <div>
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">My Tasks</h2>
                    <Link href="/dashboard/tasks" className="text-sm text-primary hover:text-primary-hover">View All</Link>
                </div>
                <div className="space-y-2">
                    {tasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task)
                        setShowTaskModal(true)
                      }}
                      className="group flex items-center gap-4 p-3 rounded-xl bg-surface/50 border border-white/5 hover:border-primary/30 transition-all cursor-pointer"
                      style={{ borderLeft: `4px solid ${task.project?.color || '#94a3b8'}` }}
                    >
                            <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleTask(task.id, task.is_completed)
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded-full border-2 border-text-muted hover:border-primary hover:bg-primary/20 transition-colors"
                            >
                                {task.is_completed && <Check className="w-3 h-3 text-primary" />}
                            </button>
                            <div className="flex-1">
                                <p className={`text-sm font-medium transition-colors ${task.is_completed ? 'line-through text-text-muted' : 'text-white'}`}>{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                          {task.project && (
                            <span className="flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color || '#94a3b8' }}></span>
                            {task.project.name}
                            </span>
                          )}
                          {task.category && (
                            <span
                              className="px-2 py-1 rounded-lg text-xs font-semibold"
                              style={{
                                backgroundColor: categoryColorMap[task.category] || '#1e293b',
                                color: '#e2e8f0',
                                border: '1px solid rgba(255,255,255,0.08)'
                              }}
                            >
                              {task.category}
                            </span>
                          )}
                            {task.assignee && (
                            <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.assignee.username}
                            </span>
                          )}
                        </div>
                            </div>
                            <Badge variant={task.priority === 'urgent' ? 'danger' : task.priority === 'high' ? 'blue' : task.priority === 'medium' ? 'warning' : 'success'} className="capitalize">{task.priority}</Badge>
                            <span className="hidden md:inline text-xs text-text-muted whitespace-nowrap">
                                {safeDate(task.due_date) || 'No due date'}
                            </span>
                        </div>
                    ))}
                     {tasks.length === 0 && (
                        <div className="text-center py-8 text-text-muted">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p>All caught up! No pending tasks.</p>
                        </div>
                    )}
                </div>
            </div>

              {/* Active Projects Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Active Projects</h2>
                  <Link href="/dashboard/projects" className="text-sm text-primary hover:text-primary-hover">View All</Link>
                </div>
                <div className="md:hidden -mx-4 px-4">
                  <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 no-scrollbar">
                    {projects.map(project => (
                      <Link href={`/dashboard/projects/${project.id}`} key={project.id} className="snap-center shrink-0 min-w-[82vw]">
                        <Card hover className="h-full group cursor-pointer border-white/5 hover:border-primary/50 transition-all">
                          <div className="flex items-start justify-between mb-4">
                              <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-xl text-white font-bold" style={{ backgroundColor: project.color || '' }}>
                                {project.name.charAt(0)}
                              </div>
                              <div className="bg-green-500/10 text-green-500 text-xs px-2 py-1 rounded-full">Active</div>
                          </div>
                          <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors">{project.name}</h3>
                          <p className="text-sm text-text-muted mt-1 line-clamp-2">Tap to view project details</p>
                          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-sm text-text-secondary">
                              <span>View Details</span>
                              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Card>
                      </Link>
                    ))}
                    <Link href="/dashboard/projects" className="snap-center shrink-0 min-w-[82vw]">
                      <Card hover className="h-full group cursor-pointer border-dashed border-white/10 hover:border-primary/50 flex flex-col items-center justify-center gap-2 min-h-[160px] text-text-muted hover:text-primary transition-all">
                        <Plus className="w-8 h-8" />
                        <span className="font-medium">Create Project</span>
                      </Card>
                    </Link>
                  </div>
                </div>
                <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map(project => (
                    <Link href={`/dashboard/projects/${project.id}`} key={project.id}>
                      <Card hover className="h-full group cursor-pointer border-white/5 hover:border-primary/50 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-xl text-white font-bold" style={{ backgroundColor: project.color || '' }}>
                              {project.name.charAt(0)}
                            </div>
                            <div className="bg-green-500/10 text-green-500 text-xs px-2 py-1 rounded-full">Active</div>
                        </div>
                        <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors">{project.name}</h3>
                        <p className="text-sm text-text-muted mt-1 line-clamp-2">Click to view project details</p>
                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-sm text-text-secondary">
                            <span>View Details</span>
                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Card>
                    </Link>
                  ))}
                  <Link href="/dashboard/projects">
                    <Card hover className="h-full group cursor-pointer border-dashed border-white/10 hover:border-primary/50 flex flex-col items-center justify-center gap-2 min-h-[160px] text-text-muted hover:text-primary transition-all">
                      <Plus className="w-8 h-8" />
                      <span className="font-medium">Create Project</span>
                    </Card>
                  </Link>
                </div>
              </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-8">
            
           {/* Time Tracker Widget */}
           <Card className="relative overflow-hidden border-none bg-gradient-to-br from-primary/20 to-surface">
                <div className="absolute top-0 right-0 p-3 opacity-20">
                    <Clock className="w-24 h-24" />
                </div>
                <div className="relative z-10 p-2">
                    <h3 className="text-lg font-medium text-white mb-4">Time Tracker</h3>
                    <div className="text-4xl font-mono font-bold text-white mb-6">
                        {formatTime(time)}
                    </div>
                    <div className="flex items-center gap-2">
                        {isRunning ? (
                             <Button onClick={() => stop()} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                                <Pause className="w-4 h-4 mr-2" /> Stop
                            </Button>
                        ) : (
                             <Button onClick={() => start()} className="flex-1 bg-primary hover:bg-primary-hover text-white">
                                <Play className="w-4 h-4 mr-2" /> Start
                            </Button>
                        )}
                    </div>
                </div>
           </Card>

           {/* Quick Notes */}
           <Card className="border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-text-primary">Recent Notes</h3>
                    <Link href="/dashboard/notes">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Plus className="w-4 h-4" /></Button>
                    </Link>
                </div>
                <div className="space-y-3">
                    {notes.map(note => (
                        <Link href={`/dashboard/notes`} key={note.id}>
                            <div className="p-3 rounded-lg bg-surface-hover/50 hover:bg-surface-hover cursor-pointer transition-colors">
                                <h4 className="font-medium text-sm text-white mb-1">{note.title || 'Untitled Note'}</h4>
                                <p className="text-xs text-text-muted">Updated {safeDate(note.created_at)} ago</p>
                            </div>
                        </Link>
                    ))}
                    {notes.length === 0 && (
                         <div className="p-4 text-center border border-dashed border-white/10 rounded-lg">
                            <p className="text-sm text-text-muted">No recent notes</p>
                         </div>
                    )}
                </div>
                <Link href="/dashboard/notes">
                    <Button variant="ghost" className="w-full mt-4 text-xs text-text-secondary hover:text-white">View All Notes</Button>
                </Link>
           </Card>

             {/* Productivity Summary */}
             <Card className="border-white/5 p-4 flex flex-col items-center justify-center text-center space-y-4">
               <div className="w-32 h-32 rounded-full border-8 border-primary/20 border-t-primary flex items-center justify-center">
                <div>
                  <p className="text-2xl font-bold text-white">{stats.completionRate}%</p>
                  <p className="text-xs text-text-muted">Productivity</p>
                </div>
               </div>
               <p className="text-sm text-text-secondary">
               {stats.tasksCompleted} done · {stats.tasksRemaining} left
               </p>
               <Link href="/dashboard/reports" className="w-full">
                <Button variant="outline" size="sm" className="w-full">View Report</Button>
               </Link>
             </Card>

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
    </div>
  )
}
