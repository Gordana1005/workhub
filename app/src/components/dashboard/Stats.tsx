'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { BarChart3, Clock, CheckCircle, TrendingUp } from 'lucide-react'

interface Stats {
  tasksCompleted: number
  timeLogged: number
  activeTasks: number
  completionRate: number
}

export default function Stats() {
  const t = useTranslations('pages.home')
  const { currentWorkspace } = useWorkspaceStore()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats', currentWorkspace?.id],
    queryFn: async (): Promise<Stats> => {
      if (!currentWorkspace) return { tasksCompleted: 0, timeLogged: 0, activeTasks: 0, completionRate: 0 }

      const userId = (await supabase.auth.getUser()).data.user?.id
      if (!userId) return { tasksCompleted: 0, timeLogged: 0, activeTasks: 0, completionRate: 0 }

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

      return {
        tasksCompleted,
        timeLogged: totalTimeLogged,
        activeTasks: activeTasksCount,
        completionRate
      }
    },
    enabled: !!currentWorkspace
  })

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return t('stats.timeValue', { hours, minutes })
  }

  const statCards = [
    {
      title: t('stats.tasksCompleted'),
      value: stats?.tasksCompleted || 0,
      icon: CheckCircle,
      color: 'text-success'
    },
    {
      title: t('stats.timeLogged'),
      value: formatTime(stats?.timeLogged || 0),
      icon: Clock,
      color: 'text-primary'
    },
    {
      title: t('stats.activeTasks'),
      value: stats?.activeTasks || 0,
      icon: BarChart3,
      color: 'text-warning'
    },
    {
      title: t('stats.completionRate'),
      value: `${stats?.completionRate || 0}%`,
      icon: TrendingUp,
      color: 'text-primary'
    }
  ]

  if (isLoading) {
    return (
      <div className="p-6 bg-surface border border-border rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-text-primary">{t('stats.title')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-surface-hover rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-surface border border-border rounded-xl">
      <h3 className="text-lg font-semibold mb-4 text-text-primary">{t('stats.title')}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="p-4 bg-surface border border-border rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">{stat.title}</p>
                <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}