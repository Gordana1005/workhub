'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import CreateWorkspaceDialog from '@/components/create/CreateWorkspaceDialog'
import WorkspaceFormDialog from '@/components/workspace/WorkspaceFormDialog'
import { WorkspaceTile, useWorkspaceCategoryLabel } from '@/components/workspace/WorkspaceTile'

interface WorkspaceStats {
  memberCount: number
  projectCount: number
  taskCount: number
}

const outlineLink =
  'inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 text-center text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-10'
const primaryLink =
  'inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-center text-sm font-medium text-white shadow-btn-primary transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:h-10'

function WorkspacesContent() {
  const t = useTranslations('pages.people')
  const categoryLabel = useWorkspaceCategoryLabel()
  const { workspaces, currentWorkspace, setCurrentWorkspace, deleteWorkspace, loading } = useWorkspaceStore()
  const searchParams = useSearchParams()

  const [showCreate, setShowCreate] = useState(searchParams.get('create') === 'true')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, WorkspaceStats>>({})
  const requested = useRef(new Set<string>())

  // Stats are fetched once per workspace; the cards render immediately without them.
  useEffect(() => {
    for (const workspace of workspaces) {
      if (requested.current.has(workspace.id)) continue
      requested.current.add(workspace.id)
      fetch(`/api/workspaces/${workspace.id}/stats`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!data) return
          setStats((current) => ({
            ...current,
            [workspace.id]: {
              memberCount: data.memberCount ?? workspace.memberCount ?? 0,
              projectCount: data.projectCount || 0,
              taskCount: data.taskCount || 0,
            },
          }))
        })
        .catch((error) => console.error(`Error loading stats for workspace ${workspace.id}:`, error))
    }
  }, [workspaces])

  const editing = workspaces.find((workspace) => workspace.id === editingId) || null

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      const removed = await deleteWorkspace(deleting.id)
      if (!removed) setNotice(t('workspaces.deleteFailed'))
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : t('workspaces.deleteFailed'))
    } finally {
      setDeleting(null)
      setDeleteBusy(false)
    }
  }

  const createButton = (
    <Button
      onClick={() => setShowCreate(true)}
      className="h-11 w-11 gap-2 px-0 sm:h-10 sm:w-auto sm:px-4"
      aria-label={t('workspaces.create')}
    >
      <Plus className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
      <span className="hidden sm:inline">{t('workspaces.create')}</span>
    </Button>
  )

  const initialLoad = loading && workspaces.length === 0

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('workspaces.title')}
        description={t('workspaces.subtitle')}
        action={initialLoad || workspaces.length > 0 ? createButton : undefined}
      />

      {notice ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {notice}
        </p>
      ) : null}

      {initialLoad ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4" aria-busy>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <EmptyState
          title={t('workspaces.emptyTitle')}
          body={t('workspaces.emptyBody')}
          action={
            <Button size="lg" onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden />
              {t('workspaces.createFirst')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
          {workspaces.map((workspace) => {
            const isActive = currentWorkspace?.id === workspace.id
            const isAdmin = workspace.userRole === 'admin'
            const numbers = stats[workspace.id]
            const memberCount = numbers?.memberCount ?? workspace.memberCount
            const dash = '–'
            const menuItems = isAdmin
              ? [
                  { label: t('workspaces.edit'), onClick: () => setEditingId(workspace.id) },
                  {
                    label: t('workspaces.delete'),
                    onClick: () => setDeleting({ id: workspace.id, name: workspace.name }),
                    danger: true,
                  },
                ]
              : []

            return (
              <article
                key={workspace.id}
                className={`flex flex-col gap-4 rounded-2xl border bg-surface p-4 transition-colors duration-150 ${
                  isActive ? 'border-primary' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <WorkspaceTile name={workspace.name} color={workspace.color} />
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 break-words text-base font-semibold text-text-primary">{workspace.name}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
                      {workspace.category ? <span>{categoryLabel(workspace.category)}</span> : null}
                      <span>{isAdmin ? t('team.roleAdmin') : t('team.roleMember')}</span>
                    </p>
                  </div>
                  {isActive ? (
                    <Badge size="sm" variant="blue">
                      {t('workspaces.active')}
                    </Badge>
                  ) : null}
                  {menuItems.length > 0 ? (
                    <div className="-mr-2 -mt-2">
                      <IconMenu
                        buttonClassName="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-surface-hover active:bg-tertiary sm:h-9 sm:w-9"
                        label={`${t('workspaces.actions')}: ${workspace.name}`}
                        items={menuItems}
                      />
                    </div>
                  ) : null}
                </div>

                {workspace.description ? (
                  <p className="line-clamp-2 break-words text-sm leading-snug text-text-secondary">{workspace.description}</p>
                ) : null}

                <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  {[
                    [t('workspaces.members'), memberCount],
                    [t('workspaces.projects'), numbers?.projectCount],
                    [t('workspaces.tasks'), numbers?.taskCount],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dd className="text-base font-semibold tabular-nums text-text-primary">{value ?? dash}</dd>
                      <dt className="text-xs text-text-muted">{label}</dt>
                    </div>
                  ))}
                </dl>

                <div className="flex gap-2">
                  {!isActive ? (
                    <Button className="h-11 flex-1 sm:h-10" onClick={() => setCurrentWorkspace(workspace)}>
                      {t('workspaces.switch')}
                    </Button>
                  ) : null}
                  <Link href={`/dashboard/workspace/${workspace.id}`} className={isActive ? primaryLink : outlineLink} onClick={() => !isActive && setCurrentWorkspace(workspace)}>
                    {t('workspaces.overview')}
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <CreateWorkspaceDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <WorkspaceFormDialog isOpen={Boolean(editing)} onClose={() => setEditingId(null)} workspace={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('workspaces.delete')}
        body={deleting ? t('workspaces.confirmDeleteNamed', { name: deleting.name }) : undefined}
        confirmLabel={t('workspaces.delete')}
        cancelLabel={t('form.cancel')}
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

export default function WorkspacesPage() {
  return (
    <Suspense fallback={null}>
      <WorkspacesContent />
    </Suspense>
  )
}
