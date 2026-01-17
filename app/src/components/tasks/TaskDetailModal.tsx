'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, User, Flag, FolderOpen, Repeat, Link2, MessageSquare, Save, Paperclip, Upload, Trash2 } from 'lucide-react'
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
  projects?: any[]
  teamMembers?: any[]
  templateData?: any
  initialProjectId?: string
  initialAssigneeId?: string
  onClose: () => void
  onSave?: () => void
  onUpdate?: (task: any) => void
  onDelete?: (taskId: string) => void
}

export default function TaskDetailModal({ 
  task, 
  workspaceId, 
  projects: externalProjects, 
  teamMembers: externalTeamMembers,
  templateData,
  initialProjectId,
  initialAssigneeId,
  onClose, 
  onSave,
  onUpdate,
  onDelete
}: TaskDetailModalProps) {
  const [projects, setProjects] = useState<any[]>(externalProjects || [])
  const [teamMembers, setTeamMembers] = useState<any[]>(externalTeamMembers || [])
  const [formData, setFormData] = useState({
    title: task?.title || templateData?.title || '',
    description: task?.description || templateData?.description || '',
    project_id: task?.project_id || initialProjectId || '',
    priority: task?.priority || templateData?.priority || 'medium',
    due_date: task?.due_date || '',
    assignee_id: task?.assignee_id || initialAssigneeId || '',
    category: task?.category || templateData?.category || '',
    estimated_hours: task?.estimated_hours || templateData?.estimated_hours || '',
    tags: task?.tags?.join(', ') || templateData?.tags?.join(', ') || ''
  })

  const [recurrence, setRecurrence] = useState<RecurrencePattern | null>(null)

  const [dependencies, setDependencies] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'details' | 'recurrence' | 'dependencies' | 'attachments' | 'comments'>('details')
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [attachments, setAttachments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  const loadDependencies = useCallback(async () => {
    if (!task?.id) return

    try {
      const { data, error } = await supabase
        .from('task_dependencies')
        .select('depends_on_task_id')
        .eq('task_id', task.id)

      // Silently handle missing table or errors - dependencies are optional
      if (!error && data) {
        setDependencies(data.map(d => d.depends_on_task_id))
      }
    } catch {
      // Silently fail - table may not exist
    }
  }, [task?.id])

  const loadAttachments = useCallback(async () => {
    if (!task?.id) return

    try {
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        task_id: task.id
      })
      const res = await fetch(`/api/attachments?${params.toString()}`)
      if (!res.ok) return
      const payload = await res.json()
      setAttachments(payload.attachments || [])
    } catch (error) {
      console.error('Error loading attachments:', error)
    }
  }, [task?.id, workspaceId])

  // Load projects and team members if not provided externally
  useEffect(() => {
    const loadProjectsAndMembers = async () => {
      if (!workspaceId) return

      // Load projects if not provided
      if (!externalProjects || externalProjects.length === 0) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name, color')
          .eq('workspace_id', workspaceId)
          .order('name')
        if (projectsData) {
          setProjects(projectsData)
        }
      }

      // Load team members if not provided
      if (!externalTeamMembers || externalTeamMembers.length === 0) {
        const { data: membersData } = await supabase
          .from('workspace_members')
          .select('user_id, profiles:profiles!workspace_members_user_id_fkey(id, username, avatar_url)')
          .eq('workspace_id', workspaceId)
        if (membersData) {
          const members = membersData
            .filter(m => m.profiles)
            .map(m => ({
              id: (m.profiles as any).id,
              username: (m.profiles as any).username,
              avatar_url: (m.profiles as any).avatar_url
            }))
          setTeamMembers(members)
        }
      }
    }
    loadProjectsAndMembers()
  }, [workspaceId, externalProjects, externalTeamMembers])

  useEffect(() => {
    // Load current user
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        if (!task && !formData.assignee_id) {
          setFormData((prev) => ({ ...prev, assignee_id: user.id }))
        }
      }
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
  }, [task, formData.assignee_id, loadDependencies])

  useEffect(() => {
    if (!task?.id) {
      setAttachments([])
    }
  }, [task?.id])

  useEffect(() => {
    if (activeTab === 'attachments') {
      loadAttachments()
    }
  }, [activeTab, loadAttachments])

  const handleUploadAttachment = async (file?: File | null) => {
    if (!file || !task?.id) return
    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspace_id', workspaceId)
      formData.append('task_id', task.id)

      const res = await fetch('/api/attachments', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const payload = await res.json()
        throw new Error(payload.error || 'Upload failed')
      }

      const payload = await res.json()
      setAttachments((prev) => [payload.attachment, ...prev])
    } catch (error) {
      console.error('Error uploading attachment:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAttachment = async (id: string) => {
    if (!id) return
    setError('')

    try {
      const res = await fetch('/api/attachments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (!res.ok) {
        const payload = await res.json()
        throw new Error(payload.error || 'Delete failed')
      }

      setAttachments((prev) => prev.filter((item) => item.id !== id))
    } catch (error) {
      console.error('Error deleting attachment:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete file')
    }
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (!formData.project_id) {
        setError('Select a project for this task')
        setSaving(false)
        return
      }

      const targetAssignee = formData.assignee_id || user.id

      const taskData = {
        workspace_id: workspaceId,
        creator_id: user.id,
        title: formData.title,
        description: formData.description || null,
        project_id: formData.project_id || null,
        priority: formData.priority,
        due_date: formData.due_date || null,
        assignee_id: targetAssignee,
        category: formData.category || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        recurrence_pattern: recurrence ? JSON.stringify(recurrence) : null
      }

      let taskId = task?.id
      let savedTask = null

      if (task?.id) {
        const res = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: task.id, ...taskData })
        })
        if (!res.ok) {
          const payload = await res.json()
          throw new Error(payload.error || 'Failed to update task')
        }
        const payload = await res.json()
        savedTask = payload.task || { ...task, ...taskData }
        taskId = task.id
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        })
        if (!res.ok) {
          const payload = await res.json()
          throw new Error(payload.error || 'Failed to create task')
        }
        const payload = await res.json()
        taskId = payload.id
      }

      // Update dependencies if any
      if (taskId && dependencies.length > 0) {
        // Delete existing dependencies first (safe to trace if 404/error ignored or handled)
        // Note: 404 is expected if table is empty or RLS blocks read, so we proceed to insert
        try {
          await supabase
            .from('task_dependencies')
            .delete()
            .eq('task_id', taskId)
        } catch (e) {
          // Ignore errors on delete for new rows or if not found
        }

        await supabase
          .from('task_dependencies')
          .insert(
            dependencies.map(depId => ({
              task_id: taskId,
              depends_on_task_id: depId
            }))
          )
      }

      // Call the appropriate callback
      if (savedTask && onUpdate) {
        onUpdate(savedTask)
      }
      if (onSave) {
        onSave()
      }
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
      setError(error instanceof Error ? error.message : 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!task?.id) return
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const res = await fetch(`/api/tasks?id=${task.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        throw new Error('Failed to delete task')
      }
      if (onDelete) {
        onDelete(task.id)
      }
      onClose()
    } catch (error) {
      console.error('Error deleting task:', error)
      setError('Failed to delete task')
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-surface/90 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-4xl h-[80vh] sm:h-auto sm:max-h-[85vh] mt-20 sm:mt-0 flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <h2 className="text-2xl font-bold text-white">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <div className="flex items-center gap-2">
            {task?.id && onDelete && (
              <button
                onClick={handleDeleteTask}
                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                title="Delete Task"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-white/10 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === 'details'
                ? 'bg-surface text-white'
                : 'text-text-secondary hover:bg-surface/50'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('recurrence')}
            className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'recurrence'
                ? 'bg-surface text-white'
                : 'text-text-secondary hover:bg-surface/50'
            }`}
          >
            <Repeat className="w-4 h-4" />
            Recurrence
          </button>
          <button
            onClick={() => setActiveTab('dependencies')}
            className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dependencies'
                ? 'bg-surface text-white'
                : 'text-text-secondary hover:bg-surface/50'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Dependencies
          </button>
          {task?.id && (
            <button
              onClick={() => setActiveTab('attachments')}
              className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'attachments'
                  ? 'bg-surface text-white'
                  : 'text-text-secondary hover:bg-surface/50'
              }`}
            >
              <Paperclip className="w-4 h-4" />
              Files
            </button>
          )}
          {task?.id && (
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'comments'
                  ? 'bg-surface text-white'
                  : 'text-text-secondary hover:bg-surface/50'
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
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Enter task title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Enter task description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    <Flag className="w-4 h-4 inline mr-1" />
                    Priority
                  </label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    <FolderOpen className="w-4 h-4 inline mr-1" />
                    Project
                  </label>
                  <select 
                    required
                    value={formData.project_id}
                    onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="" disabled>Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Assignee
                  </label>
                  <select 
                    required
                    value={formData.assignee_id}
                    onChange={(e) => setFormData({...formData, assignee_id: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="" disabled>Select assignee</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="e.g., Development, Design..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                workspaceId={workspaceId}
                selectedDependencies={dependencies}
                onChange={setDependencies}
              />
            </div>
          )}

          {activeTab === 'attachments' && task?.id && (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300 font-medium">Task Files</p>
                  <p className="text-xs text-gray-400">Upload specs, screenshots, or any supporting docs.</p>
                </div>
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900/60 text-white cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : 'hover:border-slate-500'}`}>
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadAttachment(file)
                      e.target.value = ''
                    }}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="space-y-3">
                {attachments.length === 0 ? (
                  <div className="px-4 py-3 rounded-lg border border-dashed border-slate-700 text-sm text-gray-400 bg-slate-900/40">
                    No attachments yet. Drop files here once the task is created.
                  </div>
                ) : (
                  attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900/40 border border-slate-700 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          {file.url ? (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-white hover:underline truncate block"
                            >
                              {file.file_name}
                            </a>
                          ) : (
                            <p className="text-sm text-white truncate">{file.file_name}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            {formatBytes(file.file_size)} • {file.created_at ? new Date(file.created_at).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(file.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-300 border border-transparent hover:border-red-500/30"
                        disabled={uploading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'comments' && task?.id && currentUserId && (
            <div className="py-4">
              <CommentThread taskId={task.id} currentUserId={currentUserId} />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-6 border-t border-white/10">
          {error && (
            <div className="px-4 py-3 bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg text-sm">
              {error}
            </div>
          )}
        
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-surface text-white rounded-xl border border-white/10 hover:bg-surface-hover transition-colors"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
        </div>
      </motion.div>
    </motion.div>
  )
}
