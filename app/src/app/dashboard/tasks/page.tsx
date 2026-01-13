'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { Plus, Search, CheckCircle, Circle, User, Calendar, List, LayoutGrid, CalendarDays, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useDebounce } from '@/hooks/useDebounce'
import BulkActions from '@/components/tasks/BulkActions'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import TemplateSelector from '@/components/tasks/TemplateSelector'
import { Task } from '@/components/tasks/types'

type DashboardTask = Task & {
  is_completed?: boolean
  created_at?: string
  project_id?: string
  tags?: string[]
}

// Lazy load heavy components
const KanbanBoard = dynamic(() => import('@/components/tasks/KanbanBoard'), {
  loading: () => <LoadingSkeleton type="board" />,
  ssr: false,
})

const CalendarView = dynamic(() => import('@/components/tasks/CalendarView'), {
  loading: () => <LoadingSkeleton type="calendar" />,
  ssr: false,
})

export default function TasksPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const [tasks, setTasks] = useState<DashboardTask[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<DashboardTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [templateData, setTemplateData] = useState<any>(null)
  const [quickProjectId, setQuickProjectId] = useState<string>('')
  const [quickAssigneeId, setQuickAssigneeId] = useState<string>('')
  
  // New UI state
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list')
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  console.log('TasksPage render - currentWorkspace:', currentWorkspace)

  // Wrap data loading functions in useCallback to fix exhaustive-deps warnings
  const loadTasks = useCallback(async () => {
    console.log('loadTasks called, currentWorkspace:', currentWorkspace)
    if (!currentWorkspace) {
      console.log('No current workspace, skipping loadTasks')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('Loading tasks for workspace:', currentWorkspace.id)
      
      const response = await fetch(`/api/tasks?workspace_id=${currentWorkspace.id}`)
      const result = await response.json()

      if (!response.ok) {
        console.error('Error loading tasks:', result.error)
        setTasks([])
        return
      }

      console.log('Loaded tasks:', result?.length || 0, 'tasks', result)
      setTasks(result || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace])

  const loadProjects = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      const response = await fetch(`/api/projects?workspace_id=${currentWorkspace.id}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }, [currentWorkspace])

  const loadTeamMembers = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      const response = await fetch(`/api/team?workspace_id=${currentWorkspace.id}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)
      
      const members = data.members?.map((m: any) => ({
        id: m.profiles?.id || m.user_id,
        username: m.profiles?.username || 'unknown',
        email: m.profiles?.email || ''
      })) || []
      
      setTeamMembers(members)
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }, [currentWorkspace])

  // Load data when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      loadTasks()
      loadProjects()
      loadTeamMembers()
    }
  }, [currentWorkspace, loadTasks, loadProjects, loadTeamMembers])

  // Track mobile viewport and disable board on small screens
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const mobile = e.matches
      setIsMobile(mobile)
      if (mobile && viewMode === 'board') setViewMode('list')
    }
    handler(media)
    media.addEventListener('change', handler as EventListener)
    return () => media.removeEventListener('change', handler as EventListener)
  }, [viewMode])

  // Also load data on mount in case currentWorkspace is already set
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentWorkspace) {
        loadTasks()
        loadProjects()
        loadTeamMembers()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [currentWorkspace, loadTasks, loadProjects, loadTeamMembers])

  const toggleTaskComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null
        })
      })

      if (response.ok) {
        loadTasks()
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

  // Bulk action handlers
  const handleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(filteredTasks.map(t => t.id))
    }
  }

  const handleBulkComplete = async () => {
    try {
      await Promise.all(
        selectedTasks.map(id => 
          fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              is_completed: true,
              completed_at: new Date().toISOString()
            })
          })
        )
      )
      setSelectedTasks([])
      loadTasks()
    } catch (error) {
      console.error('Error completing tasks:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTasks.length} tasks? This cannot be undone.`)) return
    
    try {
      await fetch(`/api/tasks?bulkIds=${selectedTasks.join(',')}`, {
        method: 'DELETE'
      })
      setSelectedTasks([])
      loadTasks()
    } catch (error) {
      console.error('Error deleting tasks:', error)
    }
  }

  const handleBulkPriority = async (priority: string) => {
    try {
      await Promise.all(
        selectedTasks.map(id => 
          fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, priority })
          })
        )
      )
      setSelectedTasks([])
      loadTasks()
    } catch (error) {
      console.error('Error updating priority:', error)
    }
  }

  // Filter tasks
  const filteredTasks = tasks
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
      task.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
    )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Tasks</h1>
        <p className="text-text-secondary">Manage and track all your tasks</p>
      </div>

      {/* Actions Bar */}
      <Card className="bg-surface/70 border-white/5 backdrop-blur-md p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-center md:justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface/80 border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-end w-full md:w-auto">
            <button 
              onClick={() => setShowTemplateSelector(true)}
              className="px-4 py-3 bg-surface/80 border border-white/10 rounded-xl text-text-secondary hover:text-white hover:border-primary/40 transition-colors flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              From Template
            </button>
            
            <Button 
              onClick={() => {
                setTemplateData(null)
                setShowCreateDialog(true)
              }}
              className="px-6 py-3 bg-gradient-to-r from-primary to-primary/70 text-white rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Task
            </Button>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex flex-wrap gap-2 mt-2 md:mt-4">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              viewMode === 'list'
                ? 'bg-primary text-white'
                : 'bg-surface/60 text-text-secondary hover:bg-surface-hover'
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
          {!isMobile && (
            <button
              onClick={() => setViewMode('board')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                viewMode === 'board'
                  ? 'bg-primary text-white'
                  : 'bg-surface/60 text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Board
            </button>
          )}
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              viewMode === 'calendar'
                ? 'bg-primary text-white'
                : 'bg-surface/60 text-text-secondary hover:bg-surface-hover'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Calendar
          </button>
        </div>

        {/* Quick assignment selectors */}
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-text-secondary">
          <div className="flex items-center gap-2 bg-surface/80 border border-white/10 rounded-lg px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-text-muted">Project</span>
            <select
              value={quickProjectId}
              onChange={(e) => setQuickProjectId(e.target.value)}
              className="bg-[var(--bg-secondary)] text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border border-[var(--border)] rounded-md px-2 py-1 appearance-none"
            >
              <option value="">Select</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-surface/80 border border-white/10 rounded-lg px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-text-muted">Assignee</span>
            <select
              value={quickAssigneeId}
              onChange={(e) => setQuickAssigneeId(e.target.value)}
              className="bg-[var(--bg-secondary)] text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border border-[var(--border)] rounded-md px-2 py-1 appearance-none"
            >
              <option value="">Select</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.username}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'completed', 'overdue'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-surface/60 text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <BulkActions
          selectedTasks={selectedTasks}
          onClearSelection={() => setSelectedTasks([])}
          onBulkComplete={handleBulkComplete}
          onBulkDelete={handleBulkDelete}
          onBulkChangePriority={handleBulkPriority}
        />
      )}

      {/* Tasks Content - View Mode Conditional */}
      {loading ? (
        <div className="bg-surface/70 backdrop-blur-md border border-white/5 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 bg-surface/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading tasks...</h3>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-surface/70 backdrop-blur-md border border-white/5 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 bg-surface/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-text-muted" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No tasks yet</h3>
          <p className="text-text-secondary mb-6">Create your first task to get started</p>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl hover:shadow-lg inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Task
          </Button>
        </div>
      ) : viewMode === 'board' ? (
        <KanbanBoard 
          tasks={filteredTasks} 
          onTaskUpdate={async (taskId, updates) => {
            const extraUpdates: any = {};
            if (updates.status === 'Done') extraUpdates.is_completed = true;
            else if (updates.status) extraUpdates.is_completed = false;

            await fetch('/api/tasks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: taskId, ...updates, ...extraUpdates })
            })
            loadTasks()
          }}
        />
      ) : viewMode === 'calendar' ? (
        <Card className="bg-surface/70 border-white/5 backdrop-blur-md p-2 md:p-4">
          <CalendarView 
            tasks={filteredTasks} 
            onTaskClick={(calendarTask) => {
              // Find the original task from filteredTasks
              const originalTask = filteredTasks.find(t => t.id === calendarTask.id)
              if (originalTask) {
                setEditingTask(originalTask)
                setShowEditDialog(true)
              }
            }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Select All Checkbox */}
          {filteredTasks.length > 0 && (
            <div className="bg-surface/70 backdrop-blur-md border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedTasks.length === filteredTasks.length}
                onChange={handleSelectAll}
                className="w-5 h-5 rounded border-white/20 bg-surface text-primary focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-text-secondary text-sm">
                {selectedTasks.length > 0 
                  ? `${selectedTasks.length} of ${filteredTasks.length} selected` 
                  : 'Select all'}
              </span>
              </div>
            )}

            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                layout
                onClick={() => {
                  setEditingTask(task)
                  setShowEditDialog(true)
                }}
                className="bg-surface/70 backdrop-blur-md border border-white/5 hover:border-primary/40 rounded-xl p-5 transition-all group cursor-pointer"
                style={{ borderLeft: `4px solid ${task.project?.color || '#94a3b8'}` }}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox for bulk selection */}
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      if (e.target.checked) {
                        setSelectedTasks([...selectedTasks, task.id])
                      } else {
                        setSelectedTasks(selectedTasks.filter(id => id !== task.id))
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 w-5 h-5 rounded border-white/20 bg-surface text-primary focus:ring-2 focus:ring-primary/40"
                  />

                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTaskComplete(task.id, !!task.is_completed)
                    }}
                    className="mt-1 flex-shrink-0"
                  >
                    {task.is_completed ? (
                      <CheckCircle className="w-6 h-6 text-green-500 hover:text-green-400 transition-colors" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-500 group-hover:text-primary transition-colors" />
                    )}
                  </motion.button>

                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold mb-2 ${task.is_completed ? 'text-text-muted line-through' : 'text-white'}`}>
                      {task.title}
                    </h3>
                    
                    {task.description && (
                      <p className="text-text-secondary mb-3 line-clamp-2">{task.description}</p>
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
                          {task.assignee.username}
                        </div>
                      )}

                      {task.project && (
                        <div
                          className="px-2 py-1 rounded text-xs border"
                          style={{
                            borderColor: task.project.color || '#94a3b8',
                            color: task.project.color || '#94a3b8'
                          }}
                        >
                          {task.project.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

      {/* Template Selector */}
      <AnimatePresence>
        {showTemplateSelector && (
          <TemplateSelector
            workspaceId={currentWorkspace?.id || ''}
            onClose={() => setShowTemplateSelector(false)}
            onSelectTemplate={(data) => {
              setTemplateData(data)
              setShowTemplateSelector(false)
              setShowCreateDialog(true)
            }}
          />
        )}
      </AnimatePresence>

      {/* Create Task Dialog */}
      <AnimatePresence>
        {showCreateDialog && (
          <TaskDetailModal
            workspaceId={currentWorkspace?.id || ''}
            projects={projects}
            teamMembers={teamMembers}
            templateData={templateData}
            initialProjectId={quickProjectId}
            initialAssigneeId={quickAssigneeId}
            onClose={() => {
              setShowCreateDialog(false)
              setTemplateData(null)
            }}
            onSave={loadTasks}
          />
        )}
      </AnimatePresence>

      {/* Edit Task Dialog */}
      <AnimatePresence>
        {showEditDialog && editingTask && (
          <TaskDetailModal
            task={editingTask}
            workspaceId={currentWorkspace?.id || ''}
            projects={projects}
            teamMembers={teamMembers}
            onClose={() => {
              setShowEditDialog(false)
              setEditingTask(null)
            }}
            onSave={loadTasks}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
