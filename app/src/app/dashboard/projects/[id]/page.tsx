'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Calendar, Users, CheckCircle, Circle, Clock, Target, TrendingUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Project {
  id: string
  name: string
  description: string | null
  color: string | null
  status: string
  start_date: string | null
  end_date: string | null
  created_at: string
  creator?: { full_name: string }
}

interface Task {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  is_completed: boolean
  assignee?: { full_name: string }
}

interface Member {
  id: string
  full_name: string
  avatar_url: string | null
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { currentWorkspace } = useWorkspaceStore()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false)

  // Task creation form
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assignee_id: ''
  })

  useEffect(() => {
    if (params.id && currentWorkspace) {
      loadProjectData()
    }
  }, [params.id, currentWorkspace])

  const loadProjectData = async () => {
    if (!params.id || !currentWorkspace) return

    try {
      setLoading(true)

      // Load project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          creator:profiles(full_name)
        `)
        .eq('id', params.id)
        .eq('workspace_id', currentWorkspace.id)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Load project tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!assignee_id(full_name)
        `)
        .eq('project_id', params.id)
        .order('created_at', { ascending: false })

      if (tasksError) {
        console.error('Error loading tasks:', tasksError)
        setTasks([])
      } else {
        console.log('Loaded project tasks:', tasksData?.length, tasksData)
        setTasks(tasksData || [])
      }

      // Load workspace members (potential assignees)
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('workspace_id', currentWorkspace.id)

      if (membersError) throw membersError
      setMembers(membersData?.map(m => m.profiles).filter(Boolean).flat() || [])

    } catch (error) {
      console.error('Error loading project data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentWorkspace || !project) return

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to create tasks')
        return
      }

      const { error } = await supabase
        .from('tasks')
        .insert({
          workspace_id: currentWorkspace.id,
          creator_id: user.id,
          project_id: project.id,
          title: taskFormData.title,
          description: taskFormData.description || null,
          priority: taskFormData.priority,
          due_date: taskFormData.due_date || null,
          assignee_id: taskFormData.assignee_id || null
        })

      if (error) throw error

      // Reset form and reload
      setTaskFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        assignee_id: ''
      })
      setShowCreateTaskDialog(false)
      loadProjectData()
    } catch (error) {
      console.error('Error creating task:', error)
      alert(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const toggleTaskComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', taskId)

      if (!error) {
        loadProjectData()
      }
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Loading project...</h3>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Project not found</h3>
            <p className="text-gray-400 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
            <Button
              onClick={() => router.push('/dashboard/projects')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.is_completed).length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const overdueTasks = tasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < new Date()).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.push('/dashboard/projects')}
            className="mb-4 px-4 py-2 bg-slate-800/50 text-gray-300 rounded-xl hover:bg-slate-700/50 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: project.color || '#667eea' }}
            >
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">{project.name}</h1>
              <p className="text-gray-400 text-lg">Project Details</p>
            </div>
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-gray-400 text-sm">Total Tasks</p>
                  <p className="text-2xl font-bold text-white">{totalTasks}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-gray-400 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-white">{completedTasks}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-gray-400 text-sm">Completion</p>
                  <p className="text-2xl font-bold text-white">{completionPercentage}%</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-gray-400 text-sm">Overdue</p>
                  <p className="text-2xl font-bold text-white">{overdueTasks}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Description</h2>
              {project.description ? (
                <p className="text-gray-300 leading-relaxed">{project.description}</p>
              ) : (
                <p className="text-gray-500 italic">No description provided</p>
              )}
            </div>

            {/* Tasks */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Tasks</h2>
                <Button
                  onClick={() => setShowCreateTaskDialog(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </Button>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No tasks yet</p>
                  <Button
                    onClick={() => setShowCreateTaskDialog(true)}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-900/70 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <button 
                          onClick={() => toggleTaskComplete(task.id, task.is_completed)}
                          className="flex-shrink-0 mt-1"
                        >
                          {task.is_completed ? (
                            <CheckCircle className="w-6 h-6 text-green-500 hover:text-green-400 transition-colors" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-500 hover:text-purple-500 transition-colors" />
                          )}
                        </button>

                        <div className="flex-1">
                          <h3 className={`text-lg font-semibold mb-2 ${task.is_completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                            {task.title}
                          </h3>

                          {task.description && (
                            <p className="text-gray-400 mb-3">{task.description}</p>
                          )}

                          <div className="flex flex-wrap gap-3 items-center">
                            <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>

                            {task.due_date && (
                              <div className="flex items-center gap-1 text-gray-400 text-sm">
                                <Calendar className="w-4 h-4" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </div>
                            )}

                            {task.assignee && (
                              <div className="flex items-center gap-1 text-gray-400 text-sm">
                                <Users className="w-4 h-4" />
                                {task.assignee.full_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Info */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Project Info</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${
                    project.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    project.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {project.status}
                  </span>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Created</p>
                  <p className="text-white">{new Date(project.created_at).toLocaleDateString()} at {new Date(project.created_at).toLocaleTimeString()}</p>
                </div>

                {project.creator && (
                  <div>
                    <p className="text-gray-400 text-sm">Created by</p>
                    <p className="text-white">{project.creator.full_name}</p>
                  </div>
                )}

                {project.start_date && (
                  <div>
                    <p className="text-gray-400 text-sm">Start Date</p>
                    <p className="text-white">{new Date(project.start_date).toLocaleDateString()}</p>
                  </div>
                )}

                {project.end_date && (
                  <div>
                    <p className="text-gray-400 text-sm">End Date</p>
                    <p className="text-white">{new Date(project.end_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Team Members</h2>
              {members.length === 0 ? (
                <p className="text-gray-500 italic">No team members assigned</p>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                        {member.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="text-gray-300">{member.full_name || 'Unknown User'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Task Dialog */}
        {showCreateTaskDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Task</h2>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Task Title *</label>
                  <input
                    type="text"
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task title..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    rows={4}
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                    <select
                      value={taskFormData.priority}
                      onChange={(e) => setTaskFormData({...taskFormData, priority: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={taskFormData.due_date}
                      onChange={(e) => setTaskFormData({...taskFormData, due_date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Assignee (Optional)</label>
                  <select
                    value={taskFormData.assignee_id}
                    onChange={(e) => setTaskFormData({...taskFormData, assignee_id: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>{member.full_name || 'Unknown User'}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setShowCreateTaskDialog(false)}
                    className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg"
                  >
                    Create Task
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}