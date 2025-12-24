'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Filter, CheckCircle, Circle, Clock, User, Calendar, X, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Task {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  is_completed: boolean
  project_id: string | null
  assignee_id: string | null
  created_at: string
  project?: {
    name: string
    color: string
  }
}

interface Project {
  id: string
  name: string
  color: string
}

export default function TasksPage() {
  const router = useRouter()
  const { currentWorkspace } = useWorkspaceStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    project_id: ''
  })

  useEffect(() => {
    if (currentWorkspace) {
      loadTasks()
      loadProjects()
    }
  }, [currentWorkspace])

  const loadTasks = async () => {
    if (!currentWorkspace) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(name, color)
        `)
        .eq('project_id', currentWorkspace.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    if (!currentWorkspace) return

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, color')
        .eq('workspace_id', currentWorkspace.id)

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!taskForm.project_id) {
      alert('Please select a project')
      return
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          project_id: taskForm.project_id,
          title: taskForm.title,
          description: taskForm.description || null,
          priority: taskForm.priority,
          status: 'todo',
          due_date: taskForm.due_date || null,
          is_completed: false
        })

      if (error) throw error

      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', project_id: '' })
      setShowCreateDialog(false)
      loadTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task')
    }
  }

  const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: !currentStatus })
        .eq('id', taskId)

      if (error) throw error
      loadTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      loadTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
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

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && !tasks.find(t => t.due_date === dueDate)?.is_completed
  }

  const filteredTasks = tasks.filter(task => {
    // Search filter
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Status filter
    if (filter === 'active' && task.is_completed) return false
    if (filter === 'completed' && !task.is_completed) return false
    if (filter === 'overdue' && (!task.due_date || !isOverdue(task.due_date))) return false

    return true
  })

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => !t.is_completed).length,
    completed: tasks.filter(t => t.is_completed).length,
    overdue: tasks.filter(t => t.due_date && isOverdue(t.due_date) && !t.is_completed).length
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-gray-400 text-lg">Manage and track all your tasks</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Total Tasks</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Active</p>
            <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Task
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { key: 'all', label: 'All Tasks', count: stats.total },
              { key: 'active', label: 'Active', count: stats.active },
              { key: 'completed', label: 'Completed', count: stats.completed },
              { key: 'overdue', label: 'Overdue', count: stats.overdue }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-lg capitalize transition-colors flex items-center gap-2 ${
                  filter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-gray-400 hover:bg-slate-700'
                }`}
              >
                {f.label}
                <span className="text-xs opacity-70">({f.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
            </h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all' ? 'Create your first task to get started' : 'Change filter to see other tasks'}
            </p>
            {filter === 'all' && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Task
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:bg-slate-800/70 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <button 
                    className="mt-1"
                    onClick={() => handleToggleComplete(task.id, task.is_completed)}
                  >
                    {task.is_completed ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-500 group-hover:text-blue-500 transition-colors" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`text-lg font-semibold ${
                        task.is_completed ? 'text-gray-500 line-through' : 'text-white'
                      }`}>
                        {task.title}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-400 mb-3">{task.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 items-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>

                      {task.due_date && (
                        <div className={`flex items-center gap-1 text-sm ${
                          isOverdue(task.due_date) && !task.is_completed
                            ? 'text-red-400'
                            : 'text-gray-400'
                        }`}>
                          <Calendar className="w-4 h-4" />
                          {new Date(task.due_date).toLocaleDateString()}
                          {isOverdue(task.due_date) && !task.is_completed && (
                            <span className="text-xs">(Overdue)</span>
                          )}
                        </div>
                      )}

                      {task.project && (
                        <div 
                          className="px-3 py-1 rounded-lg text-xs font-medium text-white cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: task.project.color || '#667eea' }}
                          onClick={() => router.push(`/dashboard/projects/${task.project_id}`)}
                        >
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Task</h2>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  rows={4}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Project *</label>
                <select
                  required
                  value={taskForm.project_id}
                  onChange={(e) => setTaskForm({ ...taskForm, project_id: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
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
