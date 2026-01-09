'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, User, Flag, FolderOpen, Repeat, Link2, MessageSquare, Save } from 'lucide-react'
import RecurrenceSelector from './RecurrenceSelector'
import DependencySelector from './DependencySelector'
import CommentThread from './CommentThread'
import { supabase } from '@/lib/supabase'
import { Button } from '../ui/Button'

interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  interval: number
  endDate?: Date | null
  weekDays?: number[]
  monthDay?: number
}

interface TaskDetailModalProps {
  task?: any
  workspaceId: string
  projects: any[]
  teamMembers: any[]
  templateData?: any
  onClose: () => void
  onSave: () => void
}

export default function TaskDetailModal({ 
  task, 
  workspaceId, 
  projects, 
  teamMembers,
  templateData,
  onClose, 
  onSave 
}: TaskDetailModalProps) {
  const [formData, setFormData] = useState({
    title: task?.title || templateData?.title || '',
    description: task?.description || templateData?.description || '',
    project_id: task?.project_id || '',
    priority: task?.priority || templateData?.priority || 'medium',
    due_date: task?.due_date || '',
    assignee_id: task?.assignee_id || '',
    category: task?.category || templateData?.category || '',
    estimated_hours: task?.estimated_hours || templateData?.estimated_hours || '',
    tags: task?.tags?.join(', ') || templateData?.tags?.join(', ') || ''
  })

  const [recurrence, setRecurrence] = useState<RecurrencePattern | null>(null)

  const [dependencies, setDependencies] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'details' | 'recurrence' | 'dependencies' | 'comments'>('details')
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const loadDependencies = useCallback(async () => {
    if (!task?.id) return

    try {
      const { data, error } = await supabase
        .from('task_dependencies')
        .select('depends_on_task_id')
        .eq('task_id', task.id)

      if (!error && data) {
        setDependencies(data.map(d => d.depends_on_task_id))
      }
    } catch (error) {
      console.error('Error loading dependencies:', error)
    }
  }, [task?.id])

  useEffect(() => {
    // Load current user
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
    }
    loadUser()

    if (task?.recurrence_pattern) {
      try {
        const pattern = typeof task.recurrence_pattern === 'string' 
          ? JSON.parse(task.recurrence_pattern)
          : task.recurrence_pattern
        setRecurrence(pattern)
      } catch (e) {
        console.error('Error parsing recurrence pattern:', e)
      }
    }

    if (task?.id) {
      loadDependencies()
    }
  }, [task, loadDependencies])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const taskData = {
        workspace_id: workspaceId,
        creator_id: user.id,
        title: formData.title,
        description: formData.description || null,
        project_id: formData.project_id || null,
        priority: formData.priority,
        due_date: formData.due_date || null,
        assignee_id: formData.assignee_id || null,
        category: formData.category || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        recurrence_pattern: recurrence ? JSON.stringify(recurrence) : null
      }

      let taskId = task?.id

      if (task?.id) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id)

        if (error) throw error
      } else {
        // Create new task
        const { data, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single()

        if (error) throw error
        taskId = data.id
      }

      // Update dependencies if any
      if (taskId && dependencies.length > 0) {
        // Delete existing dependencies first (safe to trace if 404/error ignored or handled)
        // Note: 404 is expected if table is empty or RLS blocks read, so we proceed to insert
        await supabase
          .from('task_dependencies')
          .delete()
          .eq('task_id', taskId)
          .then(() => {}) // Ignore errors on delete for new rows or if not found
          .catch(() => {})

        await supabase
          .from('task_dependencies')
          .insert(
            dependencies.map(depId => ({
              task_id: taskId,
              depends_on_task_id: depId
            }))
          )
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
      alert(`Failed to save task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-slate-800 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === 'details'
                ? 'bg-slate-700 text-white'
                : 'text-gray-400 hover:bg-slate-700/50'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('recurrence')}
            className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'recurrence'
                ? 'bg-slate-700 text-white'
                : 'text-gray-400 hover:bg-slate-700/50'
            }`}
          >
            <Repeat className="w-4 h-4" />
            Recurrence
          </button>
          <button
            onClick={() => setActiveTab('dependencies')}
            className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'dependencies'
                ? 'bg-slate-700 text-white'
                : 'text-gray-400 hover:bg-slate-700/50'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Dependencies
          </button>
          {task?.id && (
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'comments'
                  ? 'bg-slate-700 text-white'
                  : 'text-gray-400 hover:bg-slate-700/50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Comments
            </button>
          )}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Task Title *
                </label>
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Flag className="w-4 h-4 inline mr-1" />
                    Priority
                  </label>
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FolderOpen className="w-4 h-4 inline mr-1" />
                    Project
                  </label>
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

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Assignee
                  </label>
                  <select 
                    value={formData.assignee_id}
                    onChange={(e) => setFormData({...formData, assignee_id: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Development, Design..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., urgent, frontend, bug-fix"
                />
              </div>
            </div>
          )}

          {activeTab === 'recurrence' && (
            <div className="py-4">
              <RecurrenceSelector
                value={recurrence}
                onChange={setRecurrence}
              />
            </div>
          )}

          {activeTab === 'dependencies' && (
            <div className="py-4">
              <DependencySelector
                taskId={task?.id}
                projectId={formData.project_id}
                selectedDependencies={dependencies}
                onChange={setDependencies}
              />
            </div>
          )}

          {activeTab === 'comments' && task?.id && currentUserId && (
            <div className="py-4">
              <CommentThread taskId={task.id} currentUserId={currentUserId} />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-700">
          <Button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {task ? 'Update Task' : 'Create Task'}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
