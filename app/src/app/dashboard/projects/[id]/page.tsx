'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'
import { TaskRow } from '@/components/ui/TaskRow'
import ProjectBudgetCard from '@/components/finance/ProjectBudgetCard'

interface Project {
  id: string
  name: string
  description: string | null
  color: string | null
  status: string
  start_date: string | null
  end_date: string | null
  created_at: string
  creator_id?: string
  creator?: { username: string }
}

interface Task {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  is_completed: boolean
  category: string | null
  assignee?: { username: string }
}

interface Member {
  id: string
  username: string
  avatar_url: string | null
}

interface ProjectMember {
  id: string
  username: string
  avatar_url: string | null
  role: string
}

interface Category {
  id: string
  name: string
  color: string
}

const fieldClass =
  'w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export default function ProjectDetailPage() {
  const t = useTranslations('pages.projects')
  const locale = useLocale()
  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      active: t('status.active'),
      completed: t('status.completed'),
      planning: t('status.planning'),
      archived: t('status.archived'),
      on_hold: t('status.onHold'),
      'on-hold': t('status.onHold'),
      in_progress: t('status.inProgress'),
      'in-progress': t('status.inProgress'),
    }
    return map[s] ?? s.replace(/[-_]/g, ' ')
  }
  const priorityLabel = (p: string) => {
    const map: Record<string, string> = {
      low: t('priority.low'),
      medium: t('priority.medium'),
      high: t('priority.high'),
      urgent: t('priority.urgent'),
    }
    return map[p] ?? p
  }
  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      member: t('roles.member'),
      admin: t('roles.admin'),
      owner: t('roles.owner'),
    }
    return map[role] ?? role
  }
  const CATEGORY_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#e11d48', '#14b8a6', '#f59e0b']
  const params = useParams()
  const { currentWorkspace } = useWorkspaceStore()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false)
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] = useState(false)
  const [tab, setTab] = useState<'tasks' | 'people' | 'money'>('tasks')

  // Project editing state
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [editProjectData, setEditProjectData] = useState({
    name: '',
    description: '',
    status: 'active',
    start_date: '',
    end_date: ''
  })
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Filtering and sorting
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'title'>('date')
  const [showFilters, setShowFilters] = useState(false)

  // Task creation form
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assignee_id: '',
    category: ''
  })

  // New category form
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#667eea')

  // Team member assignment
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('')

  const loadProjectData = useCallback(async () => {
    if (!params.id || !currentWorkspace) return

    try {
      setLoading(true)

      // Load project details via API
      const projectResponse = await fetch(`/api/projects?id=${params.id}`)
      const projectResult = await projectResponse.json()

      if (!projectResponse.ok) throw new Error(projectResult.error)
      const projectData = projectResult.project

      setProject(projectData)

      // Initialize edit form data with properly formatted dates
      setEditProjectData({
        name: projectData.name || '',
        description: projectData.description || '',
        status: projectData.status || 'active',
        start_date: projectData.start_date ? projectData.start_date.split('T')[0] : '',
        end_date: projectData.end_date ? projectData.end_date.split('T')[0] : ''
      })

      // Load project tasks via API
      const tasksResponse = await fetch(`/api/tasks?project_id=${params.id}&workspace_id=${currentWorkspace.id}`)
      const tasksResult = await tasksResponse.json()

      if (!tasksResponse.ok) {
        console.error('Error loading tasks:', tasksResult.error)
        setTasks([])
      } else {
        console.log('Loaded project tasks:', tasksResult?.length, tasksResult)
        setTasks(tasksResult || [])
      }

      // Load workspace categories via API
      const categoriesResponse = await fetch(`/api/task-categories?workspace_id=${currentWorkspace.id}`)
      const categoriesResult = await categoriesResponse.json()
      if (categoriesResponse.ok) {
        setCategories(categoriesResult.categories || [])
      }

      // Load project members via team API
      const membersResponse = await fetch(`/api/team?workspace_id=${currentWorkspace.id}`)
      const membersResult = await membersResponse.json()
      if (membersResponse.ok) {
        setMembers(membersResult.members?.map((m: any) => m.profiles).filter(Boolean) || [])
      }

      // Project members - for now keep simple
      setProjectMembers([])

    } catch (error) {
      console.error('Error loading project data:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace, params.id])

  useEffect(() => {
    if (params.id && currentWorkspace) {
      loadProjectData()
    }
  }, [params.id, currentWorkspace, loadProjectData])

  const getNextCategoryColor = () => {
    const used = new Set(categories.map((c) => c.color?.toLowerCase()))
    const found = CATEGORY_COLORS.find((c) => !used.has(c.toLowerCase()))
    return found || CATEGORY_COLORS[0]
  }

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentWorkspace || !project) return

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskFormData.title,
          description: taskFormData.description || null,
          priority: taskFormData.priority,
          due_date: taskFormData.due_date || null,
          assignee_id: taskFormData.assignee_id || null,
          category: taskFormData.category || null,
          workspace_id: currentWorkspace.id,
          project_id: project.id,
          is_completed: false
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t('createTaskFailed'))
      }

      setShowCreateTaskDialog(false)
      setTaskFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        assignee_id: '',
        category: ''
      })
      loadProjectData()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleCreateCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentWorkspace) return

    try {
      const colorToSave = newCategoryColor || getNextCategoryColor()

      const response = await fetch('/api/task-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          name: newCategoryName,
          color: colorToSave
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t('createCategoryFailed'))
      }

      setCategories((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name: newCategoryName, color: colorToSave }
      ])
      setShowCreateCategoryDialog(false)
      setNewCategoryName('')
      setNewCategoryColor(getNextCategoryColor())
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
    }
    getCurrentUser()
  }, [])

  // Apply filtering and sorting when tasks or filters change
  useEffect(() => {
    let result = [...tasks]

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(task => task.category === selectedCategory)
    }

    // Filter by priority
    if (selectedPriority !== 'all') {
      result = result.filter(task => task.priority === selectedPriority)
    }

    // Sort tasks
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.due_date || 0).getTime() - new Date(a.due_date || 0).getTime()
      } else if (sortBy === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      } else {
        return a.title.localeCompare(b.title)
      }
    })

    setFilteredTasks(result)
  }, [tasks, selectedCategory, selectedPriority, sortBy])

  const handleAddMemberToProject = async () => {
    if (!selectedMemberToAdd || !project) return

    try {
      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: selectedMemberToAdd,
          role: 'member'
        })

      if (error) throw error

      setSelectedMemberToAdd('')
      setShowAddMemberDialog(false)
      loadProjectData()
    } catch (error) {
      console.error('Error adding member:', error)
      alert(t('addMemberFailed', { error: error instanceof Error ? error.message : t('unknownError') }))
    }
  }

  const handleRemoveProjectMember = async (userId: string) => {
    if (!project) return

    if (!confirm(t('removeMemberConfirm'))) return

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', project.id)
        .eq('user_id', userId)

      if (error) throw error

      loadProjectData()
    } catch (error) {
      console.error('Error removing member:', error)
      alert(t('removeMemberFailed', { error: error instanceof Error ? error.message : t('unknownError') }))
    }
  }

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
        loadProjectData()
      }
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const handleStartEditingProject = () => {
    if (!project) return
    setEditProjectData({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'active',
      start_date: project.start_date || '',
      end_date: project.end_date || ''
    })
    setIsEditingProject(true)
  }

  const handleCancelEditingProject = () => {
    setIsEditingProject(false)
  }

  const handleSaveProject = async () => {
    if (!project || !currentWorkspace) return

    try {
      // Format dates properly (YYYY-MM-DD only, no time)
      const updateData: any = {
        id: project.id,
        workspace_id: currentWorkspace.id,
        name: editProjectData.name,
        description: editProjectData.description || null,
        status: editProjectData.status
      }

      if (editProjectData.start_date) {
        updateData.start_date = editProjectData.start_date.split('T')[0]
      } else {
        updateData.start_date = null
      }

      if (editProjectData.end_date) {
        updateData.end_date = editProjectData.end_date.split('T')[0]
      } else {
        updateData.end_date = null
      }

      console.log('Updating project with:', updateData)

      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('updateFailedShort'))
      }

      setIsEditingProject(false)
      await loadProjectData()
      alert(t('updated'))
    } catch (error) {
      console.error('Error updating project:', error)
      alert(t('updateFailed', { error: error instanceof Error ? error.message : t('unknownError') }))
    }
  }

  const openNewCategory = () => {
    setNewCategoryColor(getNextCategoryColor())
    setShowCreateCategoryDialog(true)
  }

  const closeAddMember = () => {
    setShowAddMemberDialog(false)
    setSelectedMemberToAdd('')
  }

  const closeCreateCategory = () => {
    setShowCreateCategoryDialog(false)
    setNewCategoryName('')
    setNewCategoryColor(getNextCategoryColor())
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-text-muted">{t('loadingProject')}</p>
  }

  if (!project) {
    return (
      <EmptyState
        title={t('notFoundTitle')}
        body={t('notFoundBody')}
        action={
          <Link href="/dashboard/projects" className="text-sm font-medium text-primary">
            {t('backToProjects')}
          </Link>
        }
      />
    )
  }

  const descriptionLine =
    project.description?.split('\n').map((line) => line.trim()).find(Boolean) || statusLabel(project.status)

  const tabs = [
    { id: 'tasks' as const, label: t('tasksTab') },
    { id: 'people' as const, label: t('peopleTab') },
    { id: 'money' as const, label: t('moneyTab') },
  ]

  const taskDetail = (task: Task) =>
    [
      priorityLabel(task.priority),
      task.category,
      task.due_date ? new Date(task.due_date).toLocaleDateString(locale) : null,
      task.assignee?.username,
    ]
      .filter(Boolean)
      .join(' · ')

  const renderFilters = (compact: boolean) => (
    <div className={compact ? 'flex max-w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto' : 'space-y-4'}>
      <label className={compact ? 'w-40 shrink-0' : 'block'}>
        <span className={compact ? 'sr-only' : 'mb-1.5 block text-sm text-text-secondary'}>{t('category')}</span>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={fieldClass}
          aria-label={t('category')}
        >
          <option value="all">{t('allCategories')}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </label>

      <label className={compact ? 'w-40 shrink-0' : 'block'}>
        <span className={compact ? 'sr-only' : 'mb-1.5 block text-sm text-text-secondary'}>{t('priorityField')}</span>
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className={fieldClass}
          aria-label={t('priorityField')}
        >
          <option value="all">{t('allPriorities')}</option>
          <option value="urgent">{t('priority.urgent')}</option>
          <option value="high">{t('priority.high')}</option>
          <option value="medium">{t('priority.medium')}</option>
          <option value="low">{t('priority.low')}</option>
        </select>
      </label>

      <label className={compact ? 'w-40 shrink-0' : 'block'}>
        <span className={compact ? 'sr-only' : 'mb-1.5 block text-sm text-text-secondary'}>{t('sortBy')}</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'priority' | 'title')}
          className={fieldClass}
          aria-label={t('sortBy')}
        >
          <option value="date">{t('dueDate')}</option>
          <option value="priority">{t('priorityField')}</option>
          <option value="title">{t('titleAz')}</option>
        </select>
      </label>

      <button
        type="button"
        onClick={openNewCategory}
        className="shrink-0 whitespace-nowrap text-sm font-medium text-primary"
      >
        {t('newCategory')}
      </button>
    </div>
  )

  return (
    <div className="min-w-0 max-w-full space-y-5">
      <Link
        href="/dashboard/projects"
        className="inline-flex max-w-full items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        <span className="truncate">{t('backToProjects')}</span>
      </Link>

      <PageHeader
        title={project.name}
        description={descriptionLine}
        action={
          currentUserId ? (
            <IconMenu
              label={t('editProject')}
              items={[{ label: t('editProject'), onClick: handleStartEditingProject }]}
            />
          ) : null
        }
      />

      <div className="flex max-w-full flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`max-w-full rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === item.id
                ? 'bg-primary text-white'
                : 'border border-border bg-surface text-text-secondary'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div className="min-w-0 space-y-3">
          <form onSubmit={handleCreateTask} className="flex min-w-0 gap-2">
            <input
              type="text"
              required
              value={taskFormData.title}
              onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
              placeholder={t('taskTitlePlaceholder')}
              aria-label={t('taskTitle')}
              className={`${fieldClass} min-w-0 flex-1`}
            />
            <Button type="submit" className="shrink-0" disabled={!taskFormData.title.trim()}>
              {t('addTask')}
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" className="lg:hidden" onClick={() => setShowFilters(true)}>
              {t('filters')}
            </Button>
            <div className="ml-auto">
              <IconMenu
                label={t('createTask')}
                items={[{ label: t('createTask'), onClick: () => setShowCreateTaskDialog(true) }]}
              />
            </div>
          </div>

          <div className="hidden min-w-0 max-w-full lg:block">
            {renderFilters(true)}
          </div>

          {(selectedCategory !== 'all' || selectedPriority !== 'all') && (
            <div className="flex max-w-full flex-wrap items-center gap-2">
              <span className="text-sm text-text-secondary">{t('activeFilters')}</span>
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-text-secondary"
                >
                  <span className="truncate">{selectedCategory}</span>
                  <X className="h-3 w-3 shrink-0" />
                </button>
              )}
              {selectedPriority !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedPriority('all')}
                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-text-secondary"
                >
                  <span className="truncate">{priorityLabel(selectedPriority)}</span>
                  <X className="h-3 w-3 shrink-0" />
                </button>
              )}
            </div>
          )}

          {filteredTasks.length === 0 ? (
            <EmptyState title={tasks.length === 0 ? t('noTasks') : t('noTasksMatch')} />
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  detail={taskDetail(task)}
                  done={task.is_completed}
                  completeLabel={task.is_completed ? t('markIncomplete') : t('markComplete')}
                  deleteLabel={t('deleteTask')}
                  onToggle={() => toggleTaskComplete(task.id, task.is_completed)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'people' && (
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate text-base font-semibold text-text-primary">{t('projectTeam')}</h2>
            <Button type="button" className="shrink-0" onClick={() => setShowAddMemberDialog(true)}>
              {t('addMember')}
            </Button>
          </div>
          {projectMembers.length === 0 ? (
            <EmptyState title={t('noMembers')} />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {projectMembers.map((member) => (
                <li key={member.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
                    {(member.username || t('unknownUser')).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {member.username || t('unknownUser')}
                    </p>
                    <p className="truncate text-xs text-text-muted">{roleLabel(member.role)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    aria-label={t('removeMember')}
                    title={t('removeMember')}
                    onClick={() => handleRemoveProjectMember(member.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'money' && (
        <div className="min-w-0 max-w-full">
          <ProjectBudgetCard projectId={project.id} />
        </div>
      )}

      <Dialog
        open={isEditingProject}
        title={t('editProjectTitle')}
        onClose={handleCancelEditingProject}
        size="lg"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" className="w-full sm:flex-1" onClick={handleCancelEditingProject}>
              {t('cancel')}
            </Button>
            <Button type="submit" form="edit-project-form" className="w-full sm:flex-1">
              {t('saveChanges')}
            </Button>
          </div>
        }
      >
        <form
          id="edit-project-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleSaveProject()
          }}
        >
          <label className="block text-sm text-text-secondary">
            {t('projectName')}
            <input
              required
              value={editProjectData.name}
              onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('namePlaceholder')}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('description')}
            <textarea
              rows={3}
              value={editProjectData.description}
              onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('descriptionShortPlaceholder')}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('statusField')}
            <select
              value={editProjectData.status}
              onChange={(e) => setEditProjectData({ ...editProjectData, status: e.target.value })}
              className={`${fieldClass} mt-1.5`}
            >
              <option value="active">{t('status.active')}</option>
              <option value="planning">{t('status.planning')}</option>
              <option value="on_hold">{t('status.onHold')}</option>
              <option value="completed">{t('status.completed')}</option>
              <option value="archived">{t('status.archived')}</option>
            </select>
          </label>
          <label className="block text-sm text-text-secondary">
            {t('startDate')}
            <input
              type="date"
              value={editProjectData.start_date ? editProjectData.start_date.split('T')[0] : ''}
              onChange={(e) => setEditProjectData({ ...editProjectData, start_date: e.target.value })}
              className={`${fieldClass} mt-1.5`}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('endDate')}
            <input
              type="date"
              value={editProjectData.end_date ? editProjectData.end_date.split('T')[0] : ''}
              onChange={(e) => setEditProjectData({ ...editProjectData, end_date: e.target.value })}
              className={`${fieldClass} mt-1.5`}
            />
          </label>
          <div className="space-y-1 border-t border-border pt-3 text-sm text-text-secondary">
            <p>
              {t('created')}: {t('createdStamp', {
                date: new Date(project.created_at).toLocaleDateString(locale),
                time: new Date(project.created_at).toLocaleTimeString(locale),
              })}
            </p>
            {project.creator ? (
              <p>{t('createdBy')}: {project.creator.username}</p>
            ) : null}
          </div>
        </form>
      </Dialog>

      <Dialog
        open={showFilters}
        title={t('filters')}
        onClose={() => setShowFilters(false)}
        footer={
          <Button type="button" variant="secondary" className="w-full" onClick={() => setShowFilters(false)}>
            {t('close')}
          </Button>
        }
      >
        {renderFilters(false)}
      </Dialog>

      <Dialog
        open={showCreateTaskDialog}
        title={t('createTaskTitle')}
        onClose={() => setShowCreateTaskDialog(false)}
        size="lg"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" className="w-full sm:flex-1" onClick={() => setShowCreateTaskDialog(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" form="create-task-form" className="w-full sm:flex-1">
              {t('createTask')}
            </Button>
          </div>
        }
      >
        <form id="create-task-form" onSubmit={handleCreateTask} className="space-y-4">
          <label className="block text-sm text-text-secondary">
            {t('taskTitle')}
            <input
              type="text"
              required
              value={taskFormData.title}
              onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('taskTitlePlaceholder')}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('description')}
            <textarea
              rows={4}
              value={taskFormData.description}
              onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('taskDescriptionPlaceholder')}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('priorityField')}
            <select
              value={taskFormData.priority}
              onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
              className={`${fieldClass} mt-1.5`}
            >
              <option value="low">{t('priority.low')}</option>
              <option value="medium">{t('priority.medium')}</option>
              <option value="high">{t('priority.high')}</option>
              <option value="urgent">{t('priority.urgent')}</option>
            </select>
          </label>
          <label className="block text-sm text-text-secondary">
            {t('dueDate')}
            <input
              type="date"
              value={taskFormData.due_date}
              onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
              className={`${fieldClass} mt-1.5`}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('assigneeOptional')}
            <select
              value={taskFormData.assignee_id}
              onChange={(e) => setTaskFormData({ ...taskFormData, assignee_id: e.target.value })}
              className={`${fieldClass} mt-1.5`}
            >
              <option value="">{t('unassigned')}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.username || t('unknownUser')}</option>
              ))}
            </select>
          </label>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-sm text-text-secondary">{t('categoryOptional')}</span>
              <button type="button" onClick={openNewCategory} className="shrink-0 text-xs font-medium text-primary">
                {t('newCategory')}
              </button>
            </div>
            <select
              value={taskFormData.category}
              onChange={(e) => setTaskFormData({ ...taskFormData, category: e.target.value })}
              className={fieldClass}
            >
              <option value="">{t('noCategory')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={showAddMemberDialog}
        title={t('addMemberTitle')}
        onClose={closeAddMember}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" className="w-full sm:flex-1" onClick={closeAddMember}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              className="w-full sm:flex-1"
              disabled={!selectedMemberToAdd}
              onClick={handleAddMemberToProject}
            >
              {t('addMember')}
            </Button>
          </div>
        }
      >
        <label className="block text-sm text-text-secondary">
          {t('selectMember')}
          <select
            value={selectedMemberToAdd}
            onChange={(e) => setSelectedMemberToAdd(e.target.value)}
            className={`${fieldClass} mt-1.5`}
          >
            <option value="">{t('chooseMember')}</option>
            {members
              .filter((member) => !projectMembers.find((projectMember) => projectMember.id === member.id))
              .map((member) => (
                <option key={member.id} value={member.id}>{member.username || t('unknownUser')}</option>
              ))}
          </select>
        </label>
      </Dialog>

      <Dialog
        open={showCreateCategoryDialog}
        title={t('createCategoryTitle')}
        onClose={closeCreateCategory}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" className="w-full sm:flex-1" onClick={closeCreateCategory}>
              {t('cancel')}
            </Button>
            <Button type="submit" form="create-category-form" className="w-full sm:flex-1">
              {t('createCategory')}
            </Button>
          </div>
        }
      >
        <form id="create-category-form" onSubmit={handleCreateCategory} className="space-y-4">
          <label className="block text-sm text-text-secondary">
            {t('categoryName')}
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('categoryNamePlaceholder')}
            />
          </label>
          <div>
            <p className="mb-2 text-sm text-text-secondary">{t('color')}</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCategoryColor(color)}
                  aria-label={color}
                  className={`h-8 w-8 rounded-full border border-border ${newCategoryColor === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-secondary"
                aria-label={t('color')}
              />
              <input
                type="text"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className={`${fieldClass} min-w-0 flex-1`}
                placeholder="#667eea"
              />
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
