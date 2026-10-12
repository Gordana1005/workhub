'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { CheckCircle, Circle, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'

interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string
  is_completed: boolean
  project_id?: string
  assignee_id?: string
  project?: {
    name: string
    color?: string
  } | null
}


export default function MyTasks() {
  const t = useTranslations('pages.home')
  const { currentWorkspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

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

  // Load projects and team members for the modal
  useEffect(() => {
    const loadData = async () => {
      if (!currentWorkspace) return;
      
      try {
        const [projectsRes, membersRes] = await Promise.all([
          fetch(`/api/projects?workspace_id=${currentWorkspace.id}`),
          fetch(`/api/team?workspace_id=${currentWorkspace.id}`)
        ]);
        
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData || []);
        }
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setTeamMembers(membersData.members || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, [currentWorkspace]);

  const { data: tasks, isLoading, refetch } = useQuery({
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

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleTaskSave = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['myTasks'] });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-danger'
      case 'high': return 'text-warning'
      case 'medium': return 'text-primary'
      case 'low': return 'text-success'
      default: return 'text-text-secondary'
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-surface border border-border rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-text-primary">{t('myTasks')}</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-hover rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 bg-surface border border-border rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-text-primary">{t('myTasks')}</h3>

        {tasks && tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className="p-4 bg-surface border border-border border-l-4 rounded-lg hover:bg-surface-hover transition-colors duration-200 cursor-pointer"
                style={{ borderColor: task.project?.color || '#6366f1' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="break-words font-medium text-text-primary">{task.title}</h4>
                    <p className="text-sm text-text-secondary mt-1 truncate">
                      {task.project?.name}
                    </p>
                    {task.due_date && (
                      <div className="flex items-center mt-2 text-sm text-text-secondary">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center space-x-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full bg-surface-hover ${getPriorityColor(task.priority)}`}>
                      {t(`priority.${task.priority}`)}
                    </span>
                    {task.is_completed ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <Circle className="w-5 h-5 text-text-secondary" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-text-secondary">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-text-secondary" />
            <p>{t('noTasksAssigned')}</p>
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {showTaskModal && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          workspaceId={currentWorkspace?.id || ''}
          projects={projects}
          teamMembers={teamMembers}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onSave={handleTaskSave}
        />
      )}
    </>
  )
}