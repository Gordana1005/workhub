'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'
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

function WorkspacesContent() {
  const t = useTranslations('pages.people')
  const { workspaces, currentWorkspace, setCurrentWorkspace, deleteWorkspace, loading } = useWorkspaceStore()
  const searchParams = useSearchParams()
  const shouldCreate = searchParams.get('create') === 'true'

  const [showFormDialog, setShowFormDialog] = useState(shouldCreate)
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceWithStats | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [workspacesWithStats, setWorkspacesWithStats] = useState<WorkspaceWithStats[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  const loadWorkspaceStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const statsPromises = workspaces.map(async (workspace) => {
        try {
          const response = await fetch(`/api/workspaces/${workspace.id}/stats`)
          if (response.ok) {
            const stats = await response.json()
            return {
              ...workspace,
              memberCount: stats.memberCount ?? workspace.memberCount ?? 0,
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
  }, [workspaces])

  useEffect(() => {
    loadWorkspaceStats()
  }, [workspaces, loadWorkspaceStats])

  const handleEdit = (workspace: WorkspaceWithStats) => {
    setEditingWorkspace(workspace)
    setShowFormDialog(true)
  }

  const handleDelete = async (workspaceId: string) => {
    if (deletingId) return
    if (!confirm(t('workspaces.confirmDelete'))) return

    setDeletingId(workspaceId)
    try {
      const removed = await deleteWorkspace(workspaceId)
      if (!removed) alert(t('workspaces.deleteFailed'))
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : t('workspaces.deleteFailed'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleCloseDialog = () => {
    setShowFormDialog(false)
    setEditingWorkspace(null)
  }

  const openCreate = () => {
    setEditingWorkspace(null)
    setShowFormDialog(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('workspaces.title')}
        description={t('workspaces.subtitle')}
        action={
          loading || loadingStats || workspacesWithStats.length > 0 ? (
            <Button onClick={openCreate} className="gap-2" aria-label={t('workspaces.create')}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('workspaces.create')}</span>
            </Button>
          ) : undefined
        }
      />

      {loading || loadingStats ? (
        <p className="py-12 text-center text-sm text-text-secondary">{t('workspaces.loading')}</p>
      ) : workspacesWithStats.length === 0 ? (
        <EmptyState
          title={t('workspaces.emptyTitle')}
          body={t('workspaces.emptyBody')}
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('workspaces.createFirst')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {workspacesWithStats.map((workspace) => {
            const isActive = currentWorkspace?.id === workspace.id
            const isAdmin = workspace.userRole === 'admin'
            const menuItems = [
              ...(isAdmin
                ? [
                    { label: t('workspaces.edit'), onClick: () => handleEdit(workspace) },
                    {
                      label: t('workspaces.delete'),
                      onClick: () => void handleDelete(workspace.id),
                      danger: true,
                    },
                  ]
                : []),
            ]

            return (
              <article
                key={workspace.id}
                className={`rounded-2xl border bg-surface p-4 ${isActive ? 'border-primary' : 'border-border'}`}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <WorkspaceIndicator
                      name={workspace.name}
                      color={workspace.color}
                      category={workspace.category}
                      size="md"
                      showCategory
                      className="w-full min-w-0"
                    />
                    {isActive ? <p className="mt-1 text-xs font-medium text-primary">{t('workspaces.active')}</p> : null}
                    {workspace.description ? (
                      <p className="mt-2 line-clamp-2 break-words text-sm text-text-secondary">{workspace.description}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-text-secondary">
                      {workspace.memberCount || 0} {t('workspaces.members')} · {workspace.projectCount || 0}{' '}
                      {t('workspaces.projects')} · {workspace.taskCount || 0} {t('workspaces.tasks')}
                    </p>
                  </div>
                  {menuItems.length > 0 ? <IconMenu label={workspace.name} items={menuItems} /> : null}
                </div>
                {!isActive ? (
                  <Button variant="secondary" className="mt-3 w-full" onClick={() => setCurrentWorkspace(workspace)}>
                    {t('workspaces.switch')}
                  </Button>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      <WorkspaceFormDialog isOpen={showFormDialog} onClose={handleCloseDialog} workspace={editingWorkspace} />
    </div>
  )
}

export default function WorkspacesPage() {
  const t = useTranslations('pages.people')
  return (
    <Suspense fallback={<p className="py-12 text-center text-sm text-text-secondary">{t('workspaces.loading')}</p>}>
      <WorkspacesContent />
    </Suspense>
  )
}
