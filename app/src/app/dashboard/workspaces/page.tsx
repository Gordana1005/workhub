'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Building2, Plus, Settings, Users, FolderKanban, CheckSquare, Trash2, Edit, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import WorkspaceFormDialog from '@/components/workspace/WorkspaceFormDialog'
import WorkspaceIndicator from '@/components/workspace/WorkspaceIndicator'

interface WorkspaceWithStats {
  id: string
  name: string
  owner_id: string
  category?: string
  color?: string
  description?: string
  userRole: 'admin' | 'member'
  memberCount?: number
  projectCount?: number
  taskCount?: number
  created_at: string
}

export default function WorkspacesPage() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, deleteWorkspace, loading } = useWorkspaceStore()
  const searchParams = useSearchParams()
  const shouldCreate = searchParams.get('create') === 'true'

  const [showFormDialog, setShowFormDialog] = useState(shouldCreate)
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceWithStats | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [workspacesWithStats, setWorkspacesWithStats] = useState<WorkspaceWithStats[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    loadWorkspaceStats()
  }, [workspaces])

  const loadWorkspaceStats = async () => {
    setLoadingStats(true)
    try {
      // Load stats for each workspace
      const statsPromises = workspaces.map(async (workspace) => {
        try {
          const response = await fetch(`/api/workspaces/${workspace.id}/stats`)
          if (response.ok) {
            const stats = await response.json()
            return {
              ...workspace,
              projectCount: stats.projectCount || 0,
              taskCount: stats.taskCount || 0,
            }
          }
        } catch (error) {
          console.error(`Error loading stats for workspace ${workspace.id}:`, error)
        }
        return {
          ...workspace,
          projectCount: 0,
          taskCount: 0,
        }
      })

      const results = await Promise.all(statsPromises)
      setWorkspacesWithStats(results as WorkspaceWithStats[])
    } catch (error) {
      console.error('Error loading workspace stats:', error)
      setWorkspacesWithStats(workspaces as WorkspaceWithStats[])
    } finally {
      setLoadingStats(false)
    }
  }

  const handleEdit = (workspace: WorkspaceWithStats) => {
    setEditingWorkspace(workspace)
    setShowFormDialog(true)
  }

  const handleDelete = async (workspaceId: string) => {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return
    }

    setDeletingId(workspaceId)
    try {
      await deleteWorkspace(workspaceId)
    } catch (error: any) {
      alert(error.message || 'Failed to delete workspace')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCloseDialog = () => {
    setShowFormDialog(false)
    setEditingWorkspace(null)
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Workspaces</h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  Manage your workspaces and collaborate with teams
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingWorkspace(null)
                setShowFormDialog(true)
              }}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading || loadingStats ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Loading workspaces...</p>
            </div>
          </div>
        ) : workspacesWithStats.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-slate-600" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">No workspaces yet</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Create your first workspace to start organizing your projects and collaborating with your team
            </p>
            <button
              onClick={() => {
                setEditingWorkspace(null)
                setShowFormDialog(true)
              }}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors inline-flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Your First Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspacesWithStats.map((workspace, index) => {
              const isActive = currentWorkspace?.id === workspace.id
              const isDeleting = deletingId === workspace.id

              return (
                <motion.div
                  key={workspace.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-slate-800 border rounded-2xl overflow-hidden hover:shadow-xl transition-all ${
                    isActive
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-slate-700">
                    <div className="flex items-start justify-between mb-4">
                      <WorkspaceIndicator
                        name={workspace.name}
                        color={workspace.color}
                        category={workspace.category}
                        size="lg"
                        showCategory
                      />
                      
                      {isActive && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                          Active
                        </span>
                      )}
                    </div>

                    {workspace.description && (
                      <p className="text-slate-400 text-sm line-clamp-2">
                        {workspace.description}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="p-6 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
                        <Users className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-lg font-semibold text-white">
                        {workspace.memberCount || 0}
                      </div>
                      <div className="text-xs text-slate-400">Members</div>
                    </div>

                    <div className="text-center">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                        <FolderKanban className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-lg font-semibold text-white">
                        {workspace.projectCount || 0}
                      </div>
                      <div className="text-xs text-slate-400">Projects</div>
                    </div>

                    <div className="text-center">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                        <CheckSquare className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="text-lg font-semibold text-white">
                        {workspace.taskCount || 0}
                      </div>
                      <div className="text-xs text-slate-400">Tasks</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex gap-2">
                    {!isActive && (
                      <button
                        onClick={() => setCurrentWorkspace(workspace)}
                        className="flex-1 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-sm font-medium"
                      >
                        Switch
                      </button>
                    )}
                    
                    {workspace.userRole === 'admin' && (
                      <>
                        <button
                          onClick={() => handleEdit(workspace)}
                          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                          title="Edit workspace"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(workspace.id)}
                          disabled={isDeleting}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete workspace"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <WorkspaceFormDialog
        isOpen={showFormDialog}
        onClose={handleCloseDialog}
        workspace={editingWorkspace}
      />
    </div>
  )
}
