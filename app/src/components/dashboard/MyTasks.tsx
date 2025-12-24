'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { CheckCircle, Circle, Clock } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string
  is_completed: boolean
  projects?: {
    name: string
  } | null
}


export default function MyTasks() {
  const { currentWorkspace } = useWorkspaceStore();
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID once on mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUserId();
  }, []);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['myTasks', currentWorkspace?.id, userId],
    queryFn: async (): Promise<Task[]> => {
      if (!currentWorkspace || !userId) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          priority,
          due_date,
          is_completed,
          projects!inner(name)
        `)
        .eq('assignee_id', userId)
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        projects: Array.isArray(item.projects) && item.projects.length > 0
          ? item.projects[0]
          : null
      }));
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
              className="p-4 bg-surface shadow-neumorphic-inset dark:shadow-neumorphic-dark-inset rounded-md hover:shadow-neumorphic dark:hover:shadow-neumorphic-dark transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-text-primary">{task.title}</h4>
                  <p className="text-sm text-text-secondary mt-1">
                    {task.projects?.name}
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