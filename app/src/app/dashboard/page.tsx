'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { useTimerStore } from '@/stores/useTimerStore'
import { supabase } from '@/lib/supabase'
import { extractDateFromText } from '@/lib/date-parser'
import CommandPalette from '@/components/CommandPalette'
import { 
  Plus, Users, Clock, CheckCircle, Target, Zap, 
  Play, Pause, Square, Calendar, TrendingUp, ArrowRight 
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  is_completed: boolean
  estimated_hours: number | null
}

interface DashboardStats {
  tasksCompleted: number
  timeLogged: number
  activeTasks: number
  completionRate: number
  dueToday: Task[]
}

export default function Dashboard() {
  const router = useRouter()
  const { workspaces, currentWorkspace, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore()
  const { isRunning, time, start, stop, reset, tick } = useTimerStore()
  
  const [greeting, setGreeting] = useState('')
  const [userName, setUserName] = useState('there')
  const [hasFetched, setHasFetched] = useState(false)
  const [quickTaskInput, setQuickTaskInput] = useState('')
  const [stats, setStats] = useState<DashboardStats>({
    tasksCompleted: 0,
    timeLogged: 0,
    activeTasks: 0,
    completionRate: 0,
    dueToday: []
  })

  // Timer tick effect
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (isRunning) {
      interval = setInterval(() => {
        tick()
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, tick])

  useEffect(() => {
    const loadData = async () => {
      if (!hasFetched) {
        await fetchWorkspaces()
        setHasFetched(true)
      }

      if (workspaces.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(workspaces[0])
      }

      // Get user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        
        if (profile?.full_name) {
          setUserName(profile.full_name.split(' ')[0])
        }
      }

      // Fetch dashboard stats
      if (currentWorkspace) {
        const fetchStats = async () => {
          try {
            const res = await fetch(`/api/dashboard?workspaceId=${currentWorkspace.id}`)
            if (res.ok) {
              const data = await res.json()
              setStats(data)
            }
          } catch (err) {
            console.error('Failed to fetch stats:', err)
          }
        }
        await fetchStats()
      }
    }

    loadData()

    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 18) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')
  }, [fetchWorkspaces, hasFetched, workspaces, currentWorkspace, setCurrentWorkspace])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleQuickTaskAdd = async () => {
    if (!quickTaskInput.trim() || !currentWorkspace) return

    try {
      // Extract date from natural language input
      const { title, date } = extractDateFromText(quickTaskInput)

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          title: title,
          priority: 'medium',
          due_date: date ? date.toISOString() : new Date().toISOString()
        })
      })

      if (response.ok) {
        setQuickTaskInput('')
        // Refresh stats
        const res = await fetch(`/api/dashboard?workspaceId=${currentWorkspace.id}`)
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      }
    } catch (err) {
      console.error('Failed to add task:', err)
    }
  }

  const handleStartTaskTimer = (taskId: string) => {
    start(taskId)
    // Timer will now track this specific task
  }

  const toggleTaskComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null
        })
      })

      if (response.ok && currentWorkspace) {
        const res = await fetch(`/api/dashboard?workspaceId=${currentWorkspace.id}`)
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      }
    } catch (err) {
      console.error('Failed to toggle task:', err)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-500/10'
      case 'high': return 'border-orange-500 bg-orange-500/10'
      case 'medium': return 'border-blue-500 bg-blue-500/10'
      case 'low': return 'border-green-500 bg-green-500/10'
      default: return 'border-gray-500 bg-gray-500/10'
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="gradient-text">{greeting}</span>, {userName}! 👋
        </h1>
        <p className="text-gray-400 text-base md:text-lg">
          Let's make today productive. You have {stats.dueToday.length} upcoming task{stats.dueToday.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Timer + Quick Add Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Timer Widget */}
        <div className="card p-6 card-hover bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-blue-purple flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg">Active Timer</h3>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <div className="text-5xl font-bold font-mono mb-2 gradient-text">
              {formatTime(time)}
            </div>
            <p className="text-sm text-gray-400">Current session</p>
          </div>

          <div className="flex gap-2">
            {!isRunning ? (
              <button
                onClick={() => start()}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            ) : (
              <button
                onClick={() => stop()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                <Pause className="w-4 h-4 inline mr-2" />
                Pause
              </button>
            )}
            <button
              onClick={reset}
              className="btn-secondary"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Add Task */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Quick Add Task
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={quickTaskInput}
              onChange={(e) => setQuickTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickTaskAdd()}
              placeholder="What needs to be done today?"
              className="flex-1 input-field"
            />
            <button
              onClick={handleQuickTaskAdd}
              className="btn-primary"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="stat-card group cursor-pointer" onClick={() => router.push('/dashboard/tasks')}>
          <div className="stat-icon bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.tasksCompleted}</p>
          <p className="text-sm text-gray-400">Completed</p>
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-emerald-500/0 group-hover:from-green-500/10 group-hover:to-emerald-500/10 rounded-2xl transition-all" />
        </div>

        <div className="stat-card group cursor-pointer" onClick={() => router.push('/dashboard/time-tracker')}>
          <div className="stat-icon bg-gradient-to-br from-blue-500 to-cyan-600 mb-4">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.timeLogged}h</p>
          <p className="text-sm text-gray-400">Time Logged</p>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 rounded-2xl transition-all" />
        </div>

        <div className="stat-card group cursor-pointer" onClick={() => router.push('/dashboard/tasks')}>
          <div className="stat-icon bg-gradient-to-br from-purple-500 to-pink-600 mb-4">
            <Target className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.activeTasks}</p>
          <p className="text-sm text-gray-400">Active Tasks</p>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 rounded-2xl transition-all" />
        </div>

        <div className="stat-card group cursor-pointer" onClick={() => router.push('/dashboard/reports')}>
          <div className="stat-icon bg-gradient-to-br from-orange-500 to-amber-600 mb-4">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.completionRate}%</p>
          <p className="text-sm text-gray-400">Success Rate</p>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-amber-500/0 group-hover:from-orange-500/10 group-hover:to-amber-500/10 rounded-2xl transition-all" />
        </div>
      </div>

      {/* Upcoming Tasks Section */}
      <div className="card p-4 md:p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Calendar className="w-7 h-7 text-purple-400" />
            Upcoming Tasks
          </h2>
          <button
            onClick={() => router.push('/dashboard/tasks')}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {stats.dueToday.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-blue-purple flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-400 text-lg mb-2">No upcoming tasks! 🎉</p>
            <p className="text-gray-500 text-sm">You're all caught up. Great job!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.dueToday.map((task) => (
              <div
                key={task.id}
                className={`card p-4 card-hover flex items-center gap-4 border ${getPriorityColor(task.priority)}`}
              >
                <button
                  onClick={() => toggleTaskComplete(task.id, task.is_completed)}
                  className="flex-shrink-0"
                >
                  {task.is_completed ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-500 hover:border-purple-400 transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium mb-1 ${task.is_completed ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-sm text-gray-400 truncate">{task.description}</p>
                  )}
                </div>

                {task.estimated_hours && (
                  <div className="flex-shrink-0 text-sm text-gray-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {task.estimated_hours}h
                  </div>
                )}

                <button
                  onClick={() => handleStartTaskTimer(task.id)}
                  className="flex-shrink-0 btn-primary px-3 py-2 text-sm"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => router.push('/dashboard/tasks')}
          className="card p-6 card-hover text-left group"
        >
          <div className="stat-icon bg-gradient-blue-purple mb-4 group-hover:scale-110 transition-transform">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold mb-1">Tasks</h3>
          <p className="text-sm text-gray-400">Manage tasks</p>
        </button>

        <button
          onClick={() => router.push('/dashboard/projects')}
          className="card p-6 card-hover text-left group"
        >
          <div className="stat-icon bg-gradient-to-br from-purple-500 to-pink-600 mb-4 group-hover:scale-110 transition-transform">
            <Target className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold mb-1">Projects</h3>
          <p className="text-sm text-gray-400">View projects</p>
        </button>

        <button
          onClick={() => router.push('/dashboard/team')}
          className="card p-6 card-hover text-left group"
        >
          <div className="stat-icon bg-gradient-to-br from-blue-500 to-cyan-600 mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold mb-1">Team</h3>
          <p className="text-sm text-gray-400">Team members</p>
        </button>

        <button
          onClick={() => router.push('/dashboard/reports')}
          className="card p-6 card-hover text-left group"
        >
          <div className="stat-icon bg-gradient-orange mb-4 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold mb-1">Reports</h3>
          <p className="text-sm text-gray-400">View insights</p>
        </button>
      </div>

      <CommandPalette 
        onToggleTimer={() => isRunning ? stop() : start()}
      />
    </div>
  )
}
