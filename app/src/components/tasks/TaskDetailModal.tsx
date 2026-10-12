'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { X, Calendar, User, Flag, FolderOpen, Repeat, Link2, MessageSquare, Save, Paperclip, Upload, Trash2 } from 'lucide-react'
import RecurrenceSelector from './RecurrenceSelector'
import DependencySelector from './DependencySelector'
import CommentThread from './CommentThread'
import { supabase } from '@/lib/supabase'
import { Button } from '../ui/Button'
import { IconMenu } from '../ui/IconMenu'

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
  const t = useTranslations('pages.tasks')
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

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

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
        throw new Error(payload.error || t('uploadFailed'))
      }

      const payload = await res.json()
      setAttachments((prev) => [payload.attachment, ...prev])
    } catch (error) {
      console.error('Error uploading attachment:', error)
      setError(error instanceof Error ? error.message : t('uploadFileFailed'))
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
        throw new Error(payload.error || t('deleteFailed'))
      }

      setAttachments((prev) => prev.filter((item) => item.id !== id))
    } catch (error) {
      console.error('Error deleting attachment:', error)
      setError(error instanceof Error ? error.message : t('deleteFileFailed'))
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
      if (!user) throw new Error(t('notAuthenticated'))

      if (!formData.project_id) {
        setError(t('selectProjectError'))
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
          throw new Error(payload.error || t('updateTaskFailed'))
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
          throw new Error(payload.error || t('createTaskFailed'))
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
      setError(error instanceof Error ? error.message : t('saveTaskFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!task?.id) return
    if (!confirm(t('confirmDeleteTask'))) return

    try {
      const res = await fetch(`/api/tasks?id=${task.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        throw new Error(t('deleteTaskFailed'))
      }
      if (onDelete) {
        onDelete(task.id)
      }
      onClose()
    } catch (error) {
      console.error('Error deleting task:', error)
      setError(t('deleteTaskFailed'))
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] flex items-stretch justify-center sm:items-center sm:p-4"
    >
      <button
        type="button"
        aria-label={t('cancel')}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={task ? t('editTask') : t('createNewTask')}
        className="fixed inset-0 z-[81] flex h-[100dvh] w-full flex-col overflow-hidden rounded-none bg-surface text-text-primary sm:relative sm:inset-auto sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-4xl sm:rounded-2xl sm:border sm:border-border sm:shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface p-4 sm:p-6">
          <h2 className="min-w-0 truncate text-lg font-semibold text-text-primary sm:text-2xl">
            {task ? t('editTask') : t('createNewTask')}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {task?.id && onDelete && (
              <IconMenu
                label={t('deleteTask')}
                items={[{ label: t('deleteTask'), onClick: handleDeleteTask, danger: true }]}
              />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              className="rounded-lg p-2 transition-colors hover:bg-surface-hover"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface px-4 pt-2 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm transition-colors ${
              activeTab === 'details'
                ? 'border-b-2 border-primary text-text-primary'
                : 'text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {t('details')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recurrence')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm transition-colors ${
              activeTab === 'recurrence'
                ? 'border-b-2 border-primary text-text-primary'
                : 'text-text-secondary hover:bg-surface-hover'
            }`}
          >
            <Repeat className="h-4 w-4" />
            {t('recurrence')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dependencies')}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm transition-colors ${
              activeTab === 'dependencies'
                ? 'border-b-2 border-primary text-text-primary'
                : 'text-text-secondary hover:bg-surface-hover'
            }`}
          >
            <Link2 className="h-4 w-4" />
            {t('dependencies')}
          </button>
          {task?.id && (
            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm transition-colors ${
                activeTab === 'attachments'
                  ? 'border-b-2 border-primary text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <Paperclip className="h-4 w-4" />
              {t('files')}
            </button>
          )}
          {task?.id && (
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm transition-colors ${
                activeTab === 'comments'
                  ? 'border-b-2 border-primary text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              {t('comments')}
            </button>
          )}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto bg-surface p-4 sm:p-6">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('taskTitle')}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder={t('enterTaskTitle')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('description')}
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder={t('enterTaskDescription')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    <Flag className="w-4 h-4 inline mr-1" />
                    {t('priority')}
                  </label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="low">{t('priorityLow')}</option>
                    <option value="medium">{t('priorityMedium')}</option>
                    <option value="high">{t('priorityHigh')}</option>
                    <option value="urgent">{t('priorityUrgent')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {t('dueDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    <FolderOpen className="w-4 h-4 inline mr-1" />
                    {t('project')}
                  </label>
                  <select 
                    required
                    value={formData.project_id}
                    onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="" disabled>{t('selectProject')}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    {t('assignee')}
                  </label>
                  <select 
                    required
                    value={formData.assignee_id}
                    onChange={(e) => setFormData({...formData, assignee_id: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="" disabled>{t('selectAssignee')}</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('category')}
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder={t('categoryExample')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('estimatedHours')}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('tagsComma')}
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder={t('tagsExample')}
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
                  <p className="text-sm text-text-secondary font-medium">{t('taskFiles')}</p>
                  <p className="text-xs text-text-secondary">{t('taskFilesHelp')}</p>
                </div>
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-secondary text-text-primary cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : 'hover:border-primary'}`}>
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{t('upload')}</span>
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
                  <div className="px-4 py-3 rounded-lg border border-dashed border-border text-sm text-text-secondary bg-surface-hover">
                    {t('noAttachments')}
                  </div>
                ) : (
                  attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-hover border border-border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <Paperclip className="w-4 h-4 text-text-secondary flex-shrink-0" />
                        <div className="min-w-0">
                          {file.url ? (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-text-primary hover:underline truncate block"
                            >
                              {file.file_name}
                            </a>
                          ) : (
                            <p className="text-sm text-text-primary truncate">{file.file_name}</p>
                          )}
                          <p className="text-xs text-text-secondary">
                            {formatBytes(file.file_size)} • {file.created_at ? new Date(file.created_at).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={t('delete')}
                        onClick={() => handleDeleteAttachment(file.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 border border-transparent hover:border-red-500/30"
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
        <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-surface p-4 sm:p-6">
          {error && (
            <div className="px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg text-sm">
              {error}
            </div>
          )}
        
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 gap-2 text-white"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                {t('saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {task ? t('updateTask') : t('createTask')}
              </>
            )}
          </Button>
        </div>
        </div>
      </div>
    </motion.div>,
    document.body
  )
}
