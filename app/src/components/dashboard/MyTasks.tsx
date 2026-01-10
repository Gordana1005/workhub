'use client'

import { useQuery } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { CheckCircle, Circle, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string
  is_completed: boolean
  project?: {
    name: string
    color?: string
  } | null
}


export default function MyTasks() {
  const { currentWorkspace } = useWorkspaceStore();
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID once on mount
  useEffect(() => {
    const getUserId = async () => {
      try {
        const res = await fetch('/api/auth/user')
        if (!res.ok) return
        const data = await res.json()
        setUserId(data.user?.id || null)
      } catch {
        setUserId(null)
      }
    };
    getUserId();
  }, []);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['myTasks', currentWorkspace?.id, userId],
    queryFn: async (): Promise<Task[]> => {
      if (!currentWorkspace || !userId) return [];

      const response = await fetch(`/api/tasks?workspace_id=${currentWorkspace.id}`)
      if (!response.ok) throw new Error('Failed to load tasks')
      const data = await response.json()

      return (data || [])
        .filter((task: any) => task.assignee_id === userId && !task.is_completed)
        .sort((a: any, b: any) => (a.due_date || '').localeCompare(b.due_date || ''))
        .slice(0, 5)
    },
    enabled: !!currentWorkspace && !!userId,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-surface shadow-neumorphic dark:shadow-neumorphic-dark rounded-lg">
        <h3 className="text-lg font-semibold mb-4">My Tasks</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-surface shadow-neumorphic dark:shadow-neumorphic-dark rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-text-primary">My Tasks</h3>

      {tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 bg-surface shadow-neumorphic-inset dark:shadow-neumorphic-dark-inset rounded-md hover:shadow-neumorphic dark:hover:shadow-neumorphic-dark transition-all duration-200 border-l-4"
                style={{ borderColor: task.project?.color || '#6366f1' }}
              >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-text-primary">{task.title}</h4>
                  <p className="text-sm text-text-secondary mt-1">
                    {task.project?.name}
                  </p>
                  {task.due_date && (
                    <div className="flex items-center mt-2 text-sm text-text-secondary">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(task.priority)} bg-opacity-20`}>
                    {task.priority}
                  </span>
                  {task.is_completed ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-text-secondary">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No tasks assigned to you</p>
        </div>
      )}
    </div>
  )
}