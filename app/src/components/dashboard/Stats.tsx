'use client'

import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { BarChart3, Clock, CheckCircle, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Stats {
  tasksCompleted: number
  timeLogged: number
  activeTasks: number
  completionRate: number
}

export default function Stats() {
  const { currentWorkspace } = useWorkspaceStore()
  const [stats, setStats] = useState<Stats>({
    tasksCompleted: 0,
    timeLogged: 0,
    activeTasks: 0,
    completionRate: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentWorkspace) {
        setStats({ tasksCompleted: 0, timeLogged: 0, activeTasks: 0, completionRate: 0 })
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const userId = (await supabase.auth.getUser()).data.user?.id
        if (!userId) {
          setStats({ tasksCompleted: 0, timeLogged: 0, activeTasks: 0, completionRate: 0 })
          return
        }

        // Get today's date
        const today = new Date().toISOString().split('T')[0]

        // Tasks completed today
        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('id', { count: 'exact' })
          .eq('assignee_id', userId)
          .eq('is_completed', true)
          .gte('completed_at', today)

        // Time logged today (in seconds)
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('duration')
          .eq('user_id', userId)
          .eq('date', today)

        // Active tasks
        const { data: activeTasks } = await supabase
          .from('tasks')
          .select('id', { count: 'exact' })
          .eq('assignee_id', userId)
          .eq('is_completed', false)

        const totalTimeLogged = timeEntries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0
        const tasksCompleted = completedTasks?.length || 0
        const activeTasksCount = activeTasks?.length || 0

        // Calculate completion rate (simplified)
        const completionRate = activeTasksCount + tasksCompleted > 0
          ? Math.round((tasksCompleted / (activeTasksCount + tasksCompleted)) * 100)
          : 0

        setStats({
          tasksCompleted,
          timeLogged: totalTimeLogged,
          activeTasks: activeTasksCount,
          completionRate
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
        setStats({ tasksCompleted: 0, timeLogged: 0, activeTasks: 0, completionRate: 0 })
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [currentWorkspace])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const statCards = [
    {
      title: 'Tasks Completed',
      value: stats.tasksCompleted,
      icon: CheckCircle,
      color: 'text-green-500'
    },
    {
      title: 'Time Logged',
      value: formatTime(stats.timeLogged),
      icon: Clock,
      color: 'text-blue-500'
    },
    {
      title: 'Active Tasks',
      value: stats.activeTasks,
      icon: BarChart3,
      color: 'text-orange-500'
    },
    {
      title: 'Completion Rate',
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: 'text-purple-500'
    }
  ]

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-white">Today's Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl">
      <h3 className="text-lg font-semibold mb-4 text-white">Today's Stats</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="p-4 bg-slate-900 border border-slate-700 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
