'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Filter, CheckCircle, Circle, Clock, User, Calendar, List, LayoutGrid, CalendarDays, Download, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import CalendarView from '@/components/tasks/CalendarView'
import AdvancedFilter from '@/components/tasks/AdvancedFilter'
import BulkActions from '@/components/tasks/BulkActions'
import ExportDialog from '@/components/ExportDialog'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import TemplateSelector from '@/components/tasks/TemplateSelector'

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
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [templateData, setTemplateData] = useState<any>(null)
  
  // New UI state
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list')
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [taskFilters, setTaskFilters] = useState({
    status: 'all' as 'all' | 'completed' | 'active',
    priority: 'all' as 'all' | 'low' | 'medium' | 'high' | 'urgent',
    category: 'all' as 'all' | string,
    assignee: 'all' as 'all' | string,
    dateRange: 'all' as 'all' | 'today' | 'week' | 'month' | 'overdue',
    search: ''
  })

  console.log('TasksPage render - currentWorkspace:', currentWorkspace)

  // No longer needed - formData, handleCreateTask function can be removed as TaskDetailModal handles this now

  useEffect(() => {
    if (currentWorkspace) {
      loadTasks()
      loadProjects()
      loadTeamMembers()
    }
  }, [currentWorkspace])

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

  const loadTeamMembers = async () => {
    if (!currentWorkspace) return

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq('workspace_id', currentWorkspace.id)

      if (error) throw error
      
      const members = data?.map((m: any) => ({
        id: m.profiles.id,
        full_name: m.profiles.full_name,
        email: m.profiles.email
      })) || []
      
      setTeamMembers(members)
    } catch (error) {
      console.error('Error loading team members:', error)
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
          supabase
            .from('tasks')
            .update({ is_completed: true, completed_at: new Date().toISOString() })
            .eq('id', id)
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
      await Promise.all(
        selectedTasks.map(id => 
          supabase.from('tasks').delete().eq('id', id)
        )
      )
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
          supabase.from('tasks').update({ priority }).eq('id', id)
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
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

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
              <button 
                onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-gray-300 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
              >
                <Filter className="w-5 h-5" />
                Filter
              </button>

              <button 
                onClick={() => setShowExportDialog(true)}
                className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-gray-300 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Export
              </button>

              <button 
                onClick={() => setShowTemplateSelector(true)}
                className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-gray-300 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                From Template
              </button>
              
              <Button 
                onClick={() => {
                  setTemplateData(null)
                  setShowCreateDialog(true)
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Task
              </Button>
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex gap-2 mt-4 mb-4">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900/30 text-gray-400 hover:bg-slate-700/50'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                viewMode === 'board'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900/30 text-gray-400 hover:bg-slate-700/50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Board
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900/30 text-gray-400 hover:bg-slate-700/50'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Calendar
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
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

        {/* Advanced Filter */}
        {showAdvancedFilter && (
          <div className="mb-6">
            <AdvancedFilter
              filters={taskFilters}
              onFiltersChange={setTaskFilters}
            />
            <button 
              onClick={() => setShowAdvancedFilter(false)}
              className="mt-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Hide Filters
            </button>
          </div>
        )}

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
        ) : viewMode === 'board' ? (
          <KanbanBoard 
            tasks={filteredTasks.map(t => ({
              ...t,
              status: t.is_completed ? 'Done' : 'To Do'
            }))} 
            onTaskUpdate={async (taskId, updates) => {
              await supabase
                .from('tasks')
                .update(updates)
                .eq('id', taskId)
              loadTasks()
            }}
          />
        ) : viewMode === 'calendar' ? (
          <CalendarView 
            tasks={filteredTasks.map(t => ({
              ...t,
              status: t.is_completed ? 'Done' : 'To Do'
            }))} 
            onTaskClick={(calendarTask) => {
              // Find the original task from filteredTasks
              const originalTask = filteredTasks.find(t => t.id === calendarTask.id)
              if (originalTask) {
                setEditingTask(originalTask)
                setShowEditDialog(true)
              }
            }}
          />
        ) : (
          <div className="space-y-3">
            {/* Select All Checkbox */}
            {filteredTasks.length > 0 && (
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedTasks.length === filteredTasks.length}
                  onChange={handleSelectAll}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400 text-sm">
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
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/70 transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox for bulk selection */}
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
                    className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />

                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleTaskComplete(task.id, task.is_completed)}
                    className="mt-1 flex-shrink-0"
                  >
                    {task.is_completed ? (
                      <CheckCircle className="w-6 h-6 text-green-500 hover:text-green-400 transition-colors" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-500 group-hover:text-blue-500 transition-colors" />
                    )}
                  </motion.button>

                  <div className="flex-1">
                    <h3 
                      onClick={() => {
                        setEditingTask(task)
                        setShowEditDialog(true)
                      }}
                      className={`text-lg font-semibold mb-2 cursor-pointer hover:text-blue-400 transition-colors ${task.is_completed ? 'text-gray-500 line-through' : 'text-white'}`}
                    >
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
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <AnimatePresence>
        {showExportDialog && (
          <ExportDialog
            isOpen={showExportDialog}
            onClose={() => setShowExportDialog(false)}
            data={filteredTasks}
            dataType="tasks"
            defaultFilename="tasks-export"
          />
        )}
      </AnimatePresence>

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
