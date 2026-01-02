'use client'

import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Filter, CheckCircle, Circle, Clock, User, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Task {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  is_completed: boolean
  project_id: string | null
  project?: { name: string }
  assignee?: { id: string; full_name: string }
}

export default function TasksPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)

  console.log('TasksPage render - currentWorkspace:', currentWorkspace)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 'medium',
    due_date: '',
    assignee_id: ''
  })

  useEffect(() => {
    if (currentWorkspace) {
      loadTasks()
      loadProjects()
    }
  }, [currentWorkspace])

  // Also load data on mount in case currentWorkspace is already set
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentWorkspace) {
        loadTasks()
        loadProjects()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const loadTasks = async () => {
    console.log('loadTasks called, currentWorkspace:', currentWorkspace)
    if (!currentWorkspace) {
      console.log('No current workspace, skipping loadTasks')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('Loading tasks for workspace:', currentWorkspace.id)
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects!project_id(name),
          assignee:profiles!assignee_id(full_name)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading tasks:', error)
        setTasks([])
        return
      }

      console.log('Loaded tasks:', data?.length || 0, 'tasks', data)
      setTasks(data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    if (!currentWorkspace) return

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('workspace_id', currentWorkspace.id)
        .order('name')

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
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
        loadTasks()
      }
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentWorkspace) {
      alert('Please select a workspace first')
      return
    }

    console.log('Creating task with data:', {
      workspace_id: currentWorkspace.id,
      title: formData.title,
      project_id: formData.project_id || null,
      assignee_id: formData.assignee_id || null
    })

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to create tasks')
        return
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          workspace_id: currentWorkspace.id,
          creator_id: user.id,
          title: formData.title,
          description: formData.description || null,
          project_id: formData.project_id || null,
          priority: formData.priority,
          due_date: formData.due_date || null,
          assignee_id: formData.assignee_id || null
        })
        .select()

      if (error) {
        console.error('Error creating task:', error)
        throw error
      }

      console.log('Task created successfully:', data)

      // Reset form and reload
      setFormData({
        title: '',
        description: '',
        project_id: '',
        priority: 'medium',
        due_date: '',
        assignee_id: ''
      })
      setShowCreateDialog(false)
      loadTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      alert(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-gray-400 text-lg">Manage and track all your tasks</p>
        </div>

        {/* Actions Bar */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-gray-300 hover:bg-slate-700/50 transition-colors flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter
              </button>
              
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Task
              </Button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            {['all', 'active', 'completed', 'overdue'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900/30 text-gray-400 hover:bg-slate-700/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Loading tasks...</h3>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No tasks yet</h3>
            <p className="text-gray-400 mb-6">Create your first task to get started</p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Task
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks
              .filter((task) => {
                if (filter === 'all') return true
                if (filter === 'active') return !task.is_completed
                if (filter === 'completed') return task.is_completed
                if (filter === 'overdue') {
                  if (!task.due_date || task.is_completed) return false
                  return new Date(task.due_date) < new Date()
                }
                return true
              })
              .filter((task) =>
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((task) => (
              <div
                key={task.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/70 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => toggleTaskComplete(task.id, task.is_completed)}
                    className="mt-1 flex-shrink-0"
                  >
                    {task.is_completed ? (
                      <CheckCircle className="w-6 h-6 text-green-500 hover:text-green-400 transition-colors" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-500 group-hover:text-blue-500 transition-colors" />
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
                          <User className="w-4 h-4" />
                          {task.assignee.full_name}
                        </div>
                      )}

                      {task.project && (
                        <div className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                          {task.project.name}
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

      {/* Create Task Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Task</h2>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
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
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Project (Optional)</label>
                <select 
                  value={formData.project_id}
                  onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
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
  )
}
