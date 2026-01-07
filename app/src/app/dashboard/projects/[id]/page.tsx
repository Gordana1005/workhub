'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Calendar, Users, CheckCircle, Circle, Clock, Target, TrendingUp, Plus, Filter, ArrowUpDown, Tag, X, UserPlus, Edit2, Save, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
  creator?: { full_name: string }
}

interface Task {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  is_completed: boolean
  category: string | null
  assignee?: { full_name: string }
}

interface Member {
  id: string
  full_name: string
  avatar_url: string | null
}

interface ProjectMember {
  id: string
  full_name: string
  avatar_url: string | null
  role: string
}

interface Category {
  id: string
  name: string
  color: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
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

  useEffect(() => {
    if (params.id && currentWorkspace) {
      loadProjectData()
    }
  }, [params.id, currentWorkspace])

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

  const loadProjectData = async () => {
    if (!params.id || !currentWorkspace) return

    try {
      setLoading(true)

      // Load project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .eq('workspace_id', currentWorkspace.id)
        .single()

      if (projectError) throw projectError

      // Load creator info separately
      if (projectData.creator_id) {
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', projectData.creator_id)
          .single()
        
        if (creatorData) {
          projectData.creator = creatorData
        }
      }

      setProject(projectData)

      // Initialize edit form data with properly formatted dates
      setEditProjectData({
        name: projectData.name || '',
        description: projectData.description || '',
        status: projectData.status || 'active',
        start_date: projectData.start_date ? projectData.start_date.split('T')[0] : '',
        end_date: projectData.end_date ? projectData.end_date.split('T')[0] : ''
      })

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

      // Load workspace categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('task_categories')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name')

      if (!categoriesError) {
        setCategories(categoriesData || [])
      }

      // Load project members
      const { data: projectMembersData, error: projectMembersError } = await supabase
        .from('project_members')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', params.id)

      if (!projectMembersError) {
        const formattedMembers = projectMembersData?.map((pm: any) => ({
          ...pm.profiles,
          role: pm.role
        })).filter(Boolean).flat() || []
        setProjectMembers(formattedMembers)
      }

      // Load workspace members (for assignment)
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
          assignee_id: taskFormData.assignee_id || null,
          category: taskFormData.category || null
        })

      if (error) throw error

      // Reset form and reload
      setTaskFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        assignee_id: '',
        category: ''
      })
      setShowCreateTaskDialog(false)
      loadProjectData()
    } catch (error) {
      console.error('Error creating task:', error)
      alert(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentWorkspace) return

    try {
      const { error } = await supabase
        .from('task_categories')
        .insert({
          workspace_id: currentWorkspace.id,
          name: newCategoryName,
          color: newCategoryColor
        })

      if (error) throw error

      setNewCategoryName('')
      setNewCategoryColor('#667eea')
      setShowCreateCategoryDialog(false)
      loadProjectData()
    } catch (error) {
      console.error('Error creating category:', error)
      alert(`Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

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
      alert(`Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRemoveProjectMember = async (userId: string) => {
    if (!project) return

    if (!confirm('Are you sure you want to remove this member from the project?')) return

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
      alert(`Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', project.id)
        .eq('workspace_id', currentWorkspace.id)

      if (error) throw error

      setIsEditingProject(false)
      await loadProjectData()
      alert('Project updated successfully!')
    } catch (error) {
      console.error('Error updating project:', error)
      alert(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: project.color || '#667eea' }}
            >
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              {isEditingProject ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editProjectData.name}
                    onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })}
                    className="w-full text-3xl font-bold bg-slate-800/50 text-white border border-slate-600 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Project name"
                  />
                  <textarea
                    value={editProjectData.description}
                    onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })}
                    className="w-full bg-slate-800/50 text-gray-300 border border-slate-600 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg resize-none"
                    placeholder="Project description"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProject}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg inline-flex items-center gap-2 text-sm font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEditingProject}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg inline-flex items-center gap-2 text-sm font-medium"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold text-white">{project.name}</h1>
                    {currentUserId && project.creator_id === currentUserId && (
                      <button
                        onClick={handleStartEditingProject}
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                        title="Edit project"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-400 text-lg mt-1">{project.description || 'No description'}</p>
                </>
              )}
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

        {/* Project Budget Card */}
        {project && (
          <div className="mb-8">
            <ProjectBudgetCard projectId={project.id} />
          </div>
        )}

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
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 rounded-xl inline-flex items-center gap-2 transition-all ${
                      showFilters 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </Button>
                  <Button
                    onClick={() => setShowCreateTaskDialog(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Task
                  </Button>
                </div>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                      <select
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'date' | 'priority' | 'title')}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="date">Due Date</option>
                        <option value="priority">Priority</option>
                        <option value="title">Title (A-Z)</option>
                      </select>
                    </div>
                  </div>

                  {(selectedCategory !== 'all' || selectedPriority !== 'all') && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm text-gray-400">Active filters:</span>
                      {selectedCategory !== 'all' && (
                        <button
                          onClick={() => setSelectedCategory('all')}
                          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-500/30"
                        >
                          {selectedCategory}
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {selectedPriority !== 'all' && (
                        <button
                          onClick={() => setSelectedPriority('all')}
                          className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm flex items-center gap-2 hover:bg-orange-500/30"
                        >
                          {selectedPriority}
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {filteredTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">
                    {tasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
                  </p>
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
                  {filteredTasks.map((task) => (
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

                            {task.category && (
                              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium border border-purple-500/30 flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {task.category}
                              </span>
                            )}

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
                  <p className="text-gray-400 text-sm mb-1">Status</p>
                  {isEditingProject ? (
                    <select
                      value={editProjectData.status}
                      onChange={(e) => setEditProjectData({ ...editProjectData, status: e.target.value })}
                      className="w-full bg-slate-800/50 text-white border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="planning">Planning</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium capitalize ${
                      project.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      project.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  )}
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

                <div>
                  <p className="text-gray-400 text-sm mb-1">Start Date</p>
                  {isEditingProject ? (
                    <input
                      type="date"
                      value={editProjectData.start_date}
                      onChange={(e) => setEditProjectData({ ...editProjectData, start_date: e.target.value })}
                      className="w-full bg-slate-800/50 text-white border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  ) : (
                    <p className="text-white">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}</p>
                  )}
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-1">End Date</p>
                  {isEditingProject ? (
                    <input
                      type="date"
                      value={editProjectData.end_date}
                      onChange={(e) => setEditProjectData({ ...editProjectData, end_date: e.target.value })}
                      className="w-full bg-slate-800/50 text-white border border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  ) : (
                    <p className="text-white">{project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Project Team</h2>
                <Button
                  onClick={() => setShowAddMemberDialog(true)}
                  className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg inline-flex items-center gap-2 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </Button>
              </div>
              {projectMembers.length === 0 ? (
                <p className="text-gray-500 italic">No team members assigned yet</p>
              ) : (
                <div className="space-y-3">
                  {projectMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:bg-slate-900/70 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                          {member.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-gray-300 font-medium">{member.full_name || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveProjectMember(member.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Remove from project"
                      >
                        <X className="w-4 h-4" />
                      </button>
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">Category (Optional)</label>
                    <button
                      type="button"
                      onClick={() => setShowCreateCategoryDialog(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      New Category
                    </button>
                  </div>
                  <select
                    value={taskFormData.category}
                    onChange={(e) => setTaskFormData({...taskFormData, category: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>{category.name}</option>
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

        {/* Add Member Dialog */}
        {showAddMemberDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Add Team Member</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select Member</label>
                  <select
                    value={selectedMemberToAdd}
                    onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a member...</option>
                    {members
                      .filter(m => !projectMembers.find(pm => pm.id === m.id))
                      .map((member) => (
                        <option key={member.id} value={member.id}>{member.full_name || 'Unknown User'}</option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowAddMemberDialog(false)
                      setSelectedMemberToAdd('')
                    }}
                    className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddMemberToProject}
                    disabled={!selectedMemberToAdd}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Member
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Category Dialog */}
        {showCreateCategoryDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Category</h2>

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category Name *</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., SEO Optimization, Bug Fix..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="w-16 h-12 bg-slate-900/50 border border-slate-700 rounded-xl cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="#667eea"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowCreateCategoryDialog(false)
                      setNewCategoryName('')
                      setNewCategoryColor('#667eea')
                    }}
                    className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg"
                  >
                    Create Category
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