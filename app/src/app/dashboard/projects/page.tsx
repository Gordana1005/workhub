'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { FolderKanban, LayoutGrid, List, Plus, Search, X } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import ProjectCard, { PROJECT_LIST_COLUMNS } from '@/components/projects/ProjectCard'
import { statusGroup, statusRank, type ProjectSummary } from '@/components/projects/projectUtils'

// Dialogs are only downloaded once they are first opened
const CreateProjectDialog = dynamic(() => import('@/components/create/CreateProjectDialog'), { ssr: false })
const ProjectEditDialog = dynamic(() => import('@/components/projects/ProjectEditDialog'), { ssr: false })

const VIEW_STORAGE_KEY = 'trackwork-projects-view'
const GROUP_ORDER = ['active', 'planning', 'onHold', 'completed', 'archived']

type ViewMode = 'grid' | 'list'

export default function ProjectsPage() {
  const t = useTranslations('pages.projects')
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [view, setView] = useState<ViewMode>('grid')
  const [showCreate, setShowCreate] = useState(false)
  const [createEver, setCreateEver] = useState(false)
  const [editEver, setEditEver] = useState(false)
  const chipsRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState<ProjectSummary | null>(null)
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY)
      if (saved === 'grid' || saved === 'list') setView(saved)
    } catch {
      // storage can be unavailable (private mode); the default view is fine
    }
  }, [])

  useEffect(() => {
    if (showCreate) setCreateEver(true)
  }, [showCreate])
  useEffect(() => {
    if (editing) setEditEver(true)
  }, [editing])

  // keep the selected status chip in view inside the scrolling row
  useEffect(() => {
    const row = chipsRef.current
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!row || !chip) return
    row.scrollTo({ left: Math.max(0, chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2), behavior: 'smooth' })
  }, [group])

  const changeView = (next: ViewMode) => {
    setView(next)
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  const loadProjects = useCallback(async () => {
    if (!currentWorkspace) return
    try {
      const response = await fetch(`/api/projects?workspace_id=${currentWorkspace.id}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setProjects(data.projects || [])
      setLoadFailed(false)
    } catch (error) {
      console.error('Error loading projects:', error)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  // Only the workspace id matters: the store hands out a fresh object on every refresh, which would refetch needlessly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id])

  useEffect(() => {
    if (currentWorkspace) {
      setLoading(true)
      loadProjects()
    }
  // loadProjects already depends on the id; re-running for every new workspace object would fetch twice
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id, loadProjects])

  const groups = useMemo(() => {
    const counts = new Map<string, number>()
    for (const project of projects) {
      const key = statusGroup(project.status)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    const known = GROUP_ORDER.filter((key) => counts.has(key))
    const other = Array.from(counts.keys()).filter((key) => !GROUP_ORDER.includes(key))
    return [...known, ...other].map((key) => ({ key, count: counts.get(key) || 0 }))
  }, [projects])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return projects
      .filter((project) => group === 'all' || statusGroup(project.status) === group)
      .filter(
        (project) =>
          !needle ||
          project.name.toLowerCase().includes(needle) ||
          (project.description || '').toLowerCase().includes(needle)
      )
      .map((project, index) => ({ project, index }))
      .sort((a, b) => statusRank(a.project.status) - statusRank(b.project.status) || a.index - b.index)
      .map((entry) => entry.project)
  }, [projects, group, query])

  const groupLabel = (key: string) => (GROUP_ORDER.includes(key) ? t(`status.${key}`) : key.replace(/[-_]/g, ' '))

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      const response = await fetch(`/api/projects?id=${deleting.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('unknownError'))
      setProjects((list) => list.filter((project) => project.id !== deleting.id))
      setDeleting(null)
    } catch (error) {
      setDeleting(null)
      setNotice(t('deleteFailed', { error: error instanceof Error ? error.message : t('unknownError') }))
    } finally {
      setDeleteBusy(false)
    }
  }

  const filtering = Boolean(query.trim()) || group !== 'all'

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={
          loading || projects.length > 0 ? (
            <Button
              onClick={() => setShowCreate(true)}
              className="h-11 gap-2 max-sm:hidden sm:h-10"
              aria-label={t('newProject')}
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span>{t('newProject')}</span>
            </Button>
          ) : undefined
        }
      />

      {notice || loadFailed ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <p className="min-w-0 flex-1">{notice || t('loadFailed')}</p>
          <button
            type="button"
            aria-label={t('close')}
            onClick={() => {
              setNotice(null)
              setLoadFailed(false)
            }}
            className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-danger/10 active:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {projects.length > 0 ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-80 md:shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              type="search"
              enterKeyHint="search"
              aria-label={t('searchPlaceholder')}
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:h-10 sm:text-sm"
            />
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            {groups.length > 1 ? (
              <div
                ref={chipsRef}
                role="group"
                aria-label={t('statusField')}
                className="scrollbar-hide -mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 py-1 [-webkit-mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-28px),transparent)] [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-28px),transparent)] sm:-mx-1 sm:px-1 sm:[-webkit-mask-image:none] sm:[mask-image:none]"
              >
                {[{ key: 'all', count: projects.length }, ...groups].map((item) => {
                  const selected = group === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setGroup(item.key)}
                      className={`inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-9 sm:px-3.5 ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                      }`}
                    >
                      {item.key === 'all' ? t('filterAll') : groupLabel(item.key)}
                      <span className={`text-xs tabular-nums ${selected ? 'text-primary' : 'text-text-muted'}`}>{item.count}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex-1" />
            )}

            <div role="group" aria-label={t('viewMode')} className="ml-auto inline-flex shrink-0 rounded-lg border border-border bg-surface p-0.5">
              {(
                [
                  ['grid', LayoutGrid, t('gridView')],
                  ['list', List, t('listView')],
                ] as const
              ).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  aria-label={label}
                  title={label}
                  onClick={() => changeView(mode)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-8 sm:w-8 ${
                    view === mode ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(19rem,100%),1fr))] gap-4" role="status" aria-busy aria-label={t('loading')}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban />}
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Button onClick={() => setShowCreate(true)} className="h-11 gap-2 sm:h-10">
              <Plus className="h-4 w-4" aria-hidden />
              {t('createProject')}
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={t('noMatchTitle')}
          body={t('noMatchBody')}
          action={
            filtering ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('')
                  setGroup('all')
                }}
              >
                {t('clearFilters')}
              </Button>
            ) : undefined
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(19rem,100%),1fr))] gap-4">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              view="grid"
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      ) : (
        <div>
          <div
            className={`hidden items-center gap-x-4 px-4 pb-2 text-xs font-medium uppercase tracking-wide text-text-muted lg:grid ${PROJECT_LIST_COLUMNS}`}
          >
            <span>{t('columnProject')}</span>
            <span>{t('statusField')}</span>
            <span>{t('columnProgress')}</span>
            <span>{t('columnTeam')}</span>
            <span>{t('columnDue')}</span>
            <span />
          </div>
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface [&>*:first-child]:rounded-t-2xl [&>*:last-child]:rounded-b-2xl">
            {visible.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                view="list"
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))}
          </div>
        </div>
      )}

      {createEver ? (
        <CreateProjectDialog
          open={showCreate}
          onClose={() => {
            setShowCreate(false)
            loadProjects()
          }}
        />
      ) : null}

      {editEver ? (
        <ProjectEditDialog
          project={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null)
            setProjects((list) => list.map((project) => (project.id === saved.id ? { ...project, ...saved } : project)))
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('deleteProject')}
        body={deleting ? t('deleteConfirmNamed', { name: deleting.name }) : undefined}
        confirmLabel={t('deleteProject')}
        cancelLabel={t('cancel')}
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
