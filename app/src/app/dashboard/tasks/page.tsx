'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Plus, Search, List, LayoutGrid, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'
import { TaskRow } from '@/components/ui/TaskRow'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useDebounce } from '@/hooks/useDebounce'
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
  const t = useTranslations('pages.tasks')
  const locale = useLocale()
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
  
  // Filter states
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('')
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>('')
  
  // New UI state
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list')
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

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
        username: m.profiles?.username || t('unknownUser'),
        email: m.profiles?.email || ''
      })) || []
      
      setTeamMembers(members)
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }, [currentWorkspace, t])

  // Load data when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      loadTasks()
      loadProjects()
      loadTeamMembers()
    }
  }, [currentWorkspace, loadTasks, loadProjects, loadTeamMembers])

  // Below lg, force list when the board is selected and do not offer the board.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
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

  const priorityLabel = (priority: string) => {
    if (priority === 'low') return t('priorityLow')
    if (priority === 'medium') return t('priorityMedium')
    if (priority === 'high') return t('priorityHigh')
    if (priority === 'urgent') return t('priorityUrgent')
    return priority
  }

  const filterLabel = (value: string) => {
    if (value === 'all') return t('all')
    if (value === 'active') return t('active')
    if (value === 'completed') return t('completed')
    if (value === 'overdue') return t('overdue')
    return value
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(t('confirmDeleteTask'))) return
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' })
      if (response.ok) {
        setSelectedTasks(prev => prev.filter(id => id !== taskId))
        loadTasks()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
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
    if (!confirm(t('confirmBulkDelete', { count: selectedTasks.length }))) return
    
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
    .filter((task) => !selectedProjectFilter || task.project_id === selectedProjectFilter)
    .filter((task) => !selectedAssigneeFilter || task.assignee_id === selectedAssigneeFilter)

  const fieldClass =
    'w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

  const taskDetail = (task: DashboardTask) =>
    [
      priorityLabel(task.priority),
      task.project?.name,
      task.assignee?.username,
      task.due_date ? new Date(task.due_date).toLocaleDateString(locale === 'mk' ? 'mk' : 'en-US') : null,
    ].filter(Boolean).join(' · ')

  const renderFilters = (className: string) => (
    <div className={className}>
      <label className="block min-w-0 flex-1 text-sm text-text-secondary">
        {t('filterProject')}
        <select
          value={selectedProjectFilter}
          onChange={(e) => setSelectedProjectFilter(e.target.value)}
          className={`${fieldClass} mt-1.5`}
        >
          <option value="">{t('all')}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      <label className="block min-w-0 flex-1 text-sm text-text-secondary">
        {t('filterAssignee')}
        <select
          value={selectedAssigneeFilter}
          onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
          className={`${fieldClass} mt-1.5`}
        >
          <option value="">{t('all')}</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.username}</option>
          ))}
        </select>
      </label>
      <label className="block min-w-0 flex-1 text-sm text-text-secondary">
        {t('status')}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`${fieldClass} mt-1.5`}
        >
          {['all', 'active', 'completed', 'overdue'].map((value) => (
            <option key={value} value={value}>{filterLabel(value)}</option>
          ))}
        </select>
      </label>
    </div>
  )

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={
          <div className="flex items-center gap-1">
            <Button
              type="button"
              aria-label={t('newTask')}
              onClick={() => {
                setTemplateData(null)
                setShowCreateDialog(true)
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('newTask')}</span>
            </Button>
            <IconMenu
              label={t('fromTemplate')}
              items={[{ label: t('fromTemplate'), onClick: () => setShowTemplateSelector(true) }]}
            />
          </div>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            placeholder={t('searchTasks')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${fieldClass} pl-9`}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="group">
            {([
              { mode: 'list', label: t('list'), Icon: List },
              { mode: 'board', label: t('board'), Icon: LayoutGrid },
              { mode: 'calendar', label: t('calendar'), Icon: CalendarDays },
            ] as const)
              .filter((item) => !(item.mode === 'board' && isMobile))
              .map(({ mode, label, Icon }) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{label}</span>
                </button>
              ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            {t('filters')}
          </Button>
        </div>
      </div>

      <div className="hidden lg:block">
        {renderFilters('flex items-end gap-3')}
      </div>

      {selectedTasks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <span className="text-sm font-medium text-text-primary">
            {t('tasksSelected', { count: selectedTasks.length })}
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={handleBulkComplete}>
            {t('complete')}
          </Button>
          <select
            aria-label={t('changePriority')}
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return
              handleBulkPriority(e.target.value)
              e.target.value = ''
            }}
            className="h-8 rounded-lg border border-border bg-secondary px-2 text-xs text-text-primary"
          >
            <option value="">{t('changePriority')}</option>
            <option value="urgent">{t('priorityUrgent')}</option>
            <option value="high">{t('priorityHigh')}</option>
            <option value="medium">{t('priorityMedium')}</option>
            <option value="low">{t('priorityLow')}</option>
          </select>
          <Button type="button" size="sm" variant="danger" onClick={handleBulkDelete}>
            {t('delete')}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedTasks([])}>
            {t('clearSelection')}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-text-muted">{t('loadingTasks')}</p>
      ) : tasks.length === 0 ? (
        <EmptyState
          title={t('noTasksYet')}
          body={t('createFirstTask')}
        />
      ) : viewMode === 'board' && !isMobile ? (
        <div className="min-w-0 max-w-full">
          <KanbanBoard
            tasks={filteredTasks}
            onTaskClick={(boardTask) => {
              const originalTask = filteredTasks.find(item => item.id === boardTask.id)
              if (originalTask) {
                setEditingTask(originalTask)
                setShowEditDialog(true)
              }
            }}
            onTaskUpdate={async (taskId, updates) => {
              const extraUpdates: any = {}
              if (updates.status === 'Done') extraUpdates.is_completed = true
              else if (updates.status) extraUpdates.is_completed = false

              await fetch('/api/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId, ...updates, ...extraUpdates })
              })
              loadTasks()
            }}
          />
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="max-w-full overflow-x-auto">
          <CalendarView
            tasks={filteredTasks}
            onTaskClick={(calendarTask) => {
              const originalTask = filteredTasks.find(t => t.id === calendarTask.id)
              if (originalTask) {
                setEditingTask(originalTask)
                setShowEditDialog(true)
              }
            }}
          />
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState title={t('noTasksFound')} />
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
            <input
              type="checkbox"
              checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
              onChange={handleSelectAll}
              aria-label={t('selectAll')}
              className="h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-sm text-text-secondary">
              {selectedTasks.length > 0
                ? t('selectedOf', { count: selectedTasks.length, total: filteredTasks.length })
                : t('selectAll')}
            </span>
          </div>

          {filteredTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTasks.includes(task.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedTasks([...selectedTasks, task.id])
                  } else {
                    setSelectedTasks(selectedTasks.filter(id => id !== task.id))
                  }
                }}
                aria-label={task.title}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <div className="min-w-0 flex-1">
                <TaskRow
                  title={task.title}
                  detail={taskDetail(task)}
                  done={!!task.is_completed}
                  completeLabel={t('markComplete')}
                  deleteLabel={t('delete')}
                  onOpen={() => {
                    setEditingTask(task)
                    setShowEditDialog(true)
                  }}
                  onToggle={() => toggleTaskComplete(task.id, !!task.is_completed)}
                  onDelete={() => handleDeleteTask(task.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={filtersOpen}
        title={t('filters')}
        onClose={() => setFiltersOpen(false)}
      >
        {renderFilters('space-y-4')}
      </Dialog>

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
