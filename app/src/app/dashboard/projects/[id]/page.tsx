'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Settings, FileText, Calendar, CheckCircle, Plus, X, Trash2 } from 'lucide-react'
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
}

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  created_at: string
}

type TabType = 'board' | 'timeline' | 'notes' | 'settings'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('board')
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  })

  useEffect(() => {
    loadProject()
    loadTasks()
  }, [projectId])

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title: taskForm.title,
          description: taskForm.description || null,
          priority: taskForm.priority,
          status: 'todo',
          due_date: taskForm.due_date || null
        })

      if (error) throw error

      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' })
      setShowTaskDialog(false)
      loadTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task')
    }
  }

  const handleDeleteProject = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error
      router.push('/dashboard/projects')
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    }
  }

  const todoTasks = tasks.filter(t => t.status === 'todo')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const doneTasks = tasks.filter(t => t.status === 'done')

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 text-center">
        <h1 className="text-2xl font-bold text-white">Project not found</h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Projects
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: project.color || '#667eea' }}
            >
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{project.name}</h1>
              {project.description && (
                <p className="text-gray-400">{project.description}</p>
              )}
            </div>
          </div>
          <span className={`px-4 py-2 rounded-xl text-sm font-medium ${
            project.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            project.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
            project.status === 'on-hold' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            project.status === 'completed' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            {project.status.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700 mb-8">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('board')}
            className={`pb-4 px-2 font-medium transition-all ${
              activeTab === 'board'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CheckCircle className="w-5 h-5 inline mr-2" />
            Board
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-4 px-2 font-medium transition-all ${
              activeTab === 'timeline'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5 inline mr-2" />
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`pb-4 px-2 font-medium transition-all ${
              activeTab === 'notes'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Notes
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 px-2 font-medium transition-all ${
              activeTab === 'settings'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5 inline mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'board' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Task Board</h2>
            <Button
              onClick={() => setShowTaskDialog(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Task
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* To Do Column */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">To Do ({todoTasks.length})</h3>
              <div className="space-y-3">
                {todoTasks.map(task => (
                  <div key={task.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                    <h4 className="font-medium text-white mb-2">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                        task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">In Progress ({inProgressTasks.length})</h3>
              <div className="space-y-3">
                {inProgressTasks.map(task => (
                  <div key={task.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                    <h4 className="font-medium text-white mb-2">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                        task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Done Column */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">Done ({doneTasks.length})</h3>
              <div className="space-y-3">
                {doneTasks.map(task => (
                  <div key={task.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700 opacity-60">
                    <h4 className="font-medium text-white mb-2 line-through">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Timeline View</h3>
          <p className="text-gray-400">Timeline visualization coming soon</p>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Project Notes</h3>
          <p className="text-gray-400">Notes feature coming soon</p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Danger Zone</h3>
            <p className="text-gray-400 mb-4">
              Deleting this project will permanently remove all associated tasks and data.
            </p>
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 inline-flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete Project
            </Button>
          </div>
        </div>
      )}

      {/* Task Creation Dialog */}
      {showTaskDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Task</h2>
              <button
                onClick={() => setShowTaskDialog(false)}
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
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task description..."
                />
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
                  onClick={() => setShowTaskDialog(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Delete Project?</h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteProject}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
