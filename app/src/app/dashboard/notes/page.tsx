'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import NotesList from '@/components/notes/NotesList'
import { stripHtml, type NoteProject, type NoteRecord, type NoteTag } from '@/components/notes/noteUtils'
import { BookOpen, Plus, Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'

// The reader/editor (and TipTap with it) is only downloaded once a note is opened
const NotePane = dynamic(() => import('@/components/notes/NotePane'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[80] space-y-4 bg-surface px-4 pt-20 md:static md:z-auto md:flex-1 md:rounded-2xl md:border md:border-border" role="status" aria-busy="true">
      <div className="skeleton h-8 w-3/4" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-5/6" />
    </div>
  ),
})
const TemplateSelector = dynamic(() => import('@/components/notes/TemplateSelector'), { ssr: false })

const selectClass =
  'h-11 w-full min-w-0 rounded-lg border border-border bg-secondary px-2.5 text-base text-text-primary sm:h-9 sm:text-[13px] transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function syncUrl(noteId: string | null) {
  try {
    const url = new URL(window.location.href)
    if (noteId) url.searchParams.set('note', noteId)
    else url.searchParams.delete('note')
    window.history.replaceState(window.history.state, '', url.toString())
  } catch {
    // The address bar is a nicety; never let it break the page.
  }
}

export default function NotesPage() {
  const t = useTranslations('pages.notes')
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const { currentWorkspace, workspaces } = useWorkspaceStore()
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('')
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [projects, setProjects] = useState<NoteProject[]>([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createKey, setCreateKey] = useState(0)
  const [templateContent, setTemplateContent] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const loadSeq = useRef(0)
  const isMd = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    if (currentWorkspace && !activeWorkspaceId) {
      setActiveWorkspaceId(currentWorkspace.id)
    }
  }, [currentWorkspace, activeWorkspaceId])

  useEffect(() => {
    let active = true
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active) setUserId(data.user?.id ?? null)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Deep link: /dashboard/notes?note=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('note')
    if (id) setSelectedId(id)
  }, [])

  // On tablet/desktop the workspace fills the viewport below the shell header and the
  // panes scroll on their own, so measure where we start and size to what is left.
  useEffect(() => {
    const measure = () => {
      const el = rootRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      const parent = el.closest('main') ?? el.parentElement
      const paddingBottom = parent ? parseFloat(getComputedStyle(parent).paddingBottom) || 0 : 0
      el.style.setProperty('--notes-h', `${Math.max(480, Math.floor(window.innerHeight - top - paddingBottom))}px`)
    }

    measure()
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(document.documentElement)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [])

  const loadProjects = useCallback(async () => {
    const wsId = activeWorkspaceId || currentWorkspace?.id
    if (!wsId) return

    try {
      const response = await fetch(`/api/projects?workspace_id=${wsId}`)
      const data = await response.json()

      if (response.ok && data.projects) {
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setProjectsLoaded(true)
    }
  }, [activeWorkspaceId, currentWorkspace?.id])

  const loadNotes = useCallback(
    async (silent = false) => {
      const wsId = activeWorkspaceId || currentWorkspace?.id
      if (!wsId) return

      const seq = ++loadSeq.current
      try {
        if (!silent) setLoading(true)

        const url = selectedProjectId
          ? `/api/notes?projectId=${selectedProjectId}`
          : `/api/notes?workspaceId=${wsId}`

        const response = await fetch(url)
        const data = await response.json()
        if (seq !== loadSeq.current) return

        if (response.ok) {
          setNotes(Array.isArray(data) ? data : [])
        } else {
          console.error('Error loading notes:', data.error)
        }
      } catch (error) {
        console.error('Error loading notes:', error)
      } finally {
        if (seq === loadSeq.current) setLoading(false)
      }
    },
    [activeWorkspaceId, currentWorkspace?.id, selectedProjectId]
  )

  useEffect(() => {
    if (activeWorkspaceId) {
      loadProjects()
      loadNotes()
    }
  }, [activeWorkspaceId, loadNotes, loadProjects])

  const workspaceId = activeWorkspaceId || currentWorkspace?.id || ''

  const sortedNotes = useMemo(
    () =>
      [...notes].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
      ),
    [notes]
  )

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sortedNotes
    return sortedNotes.filter(
      (note) =>
        (note.title || '').toLowerCase().includes(query) ||
        stripHtml(note.content).toLowerCase().includes(query) ||
        (note.project?.name || '').toLowerCase().includes(query) ||
        (note.tags ?? []).some((tag) => tag.name.toLowerCase().includes(query))
    )
  }, [sortedNotes, searchQuery])

  const selectedNote = useMemo(() => notes.find((note) => note.id === selectedId) ?? null, [notes, selectedId])
  const paneOpen = creating || selectedNote !== null

  const selectNote = useCallback((id: string | null) => {
    setSelectedId(id)
    syncUrl(id)
  }, [])

  // With room for two panes, never leave the reader empty: show the most recent note.
  useEffect(() => {
    if (loading || !isMd || creating || selectedNote) return
    if (filteredNotes[0]) selectNote(filteredNotes[0].id)
  }, [loading, isMd, creating, selectedNote, filteredNotes, selectNote])

  const openCreate = () => {
    if (projects.length === 0) return
    setTemplateContent('')
    setCreateKey((key) => key + 1)
    setCreating(true)
  }

  const openNote = (note: NoteRecord) => {
    setCreating(false)
    setTemplateContent('')
    selectNote(note.id)
  }

  const closePane = () => {
    if (creating) {
      setCreating(false)
      setTemplateContent('')
      return
    }
    selectNote(null)
  }

  const handleCreate = async (title: string, content: string, tags: NoteTag[], targetProjectId: string) => {
    const finalProjectId = targetProjectId || selectedProjectId
    if (!finalProjectId) throw new Error('Project is required')

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: finalProjectId, title, content, tags }),
    })
    if (!res.ok) throw new Error(`Create failed (${res.status})`)

    const created = (await res.json()) as NoteRecord
    const project = projects.find((item) => item.id === finalProjectId)
    setNotes((current) => [{ ...created, tags, project: project ? { name: project.name } : null }, ...current])
    setCreating(false)
    setTemplateContent('')
    selectNote(created.id)
    loadNotes(true)
  }

  const handleUpdate = async (title: string, content: string, tags: NoteTag[]) => {
    if (!selectedNote) return
    const id = selectedNote.id

    const res = await fetch('/api/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, content, tags }),
    })
    if (!res.ok) throw new Error(`Update failed (${res.status})`)

    const updated = (await res.json().catch(() => null)) as NoteRecord | null
    setNotes((current) =>
      current.map((note) =>
        note.id === id
          ? { ...note, title, content, tags, updated_at: updated?.updated_at ?? new Date().toISOString() }
          : note
      )
    )
    loadNotes(true)
  }

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: t('deleteConfirm'), confirmLabel: t('deleteNote') }))) return

    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })

      if (res.ok) {
        setNotes((current) => current.filter((note) => note.id !== id))
        if (selectedId === id) selectNote(null)
        loadNotes(true)
      } else {
        toast.error(t('deleteFailed'))
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
      toast.error(t('deleteFailed'))
    }
  }

  const hasFilters = Boolean(selectedProjectId)
  const noProjects = projectsLoaded && projects.length === 0
  const noNotesAtAll = projectsLoaded && !loading && notes.length === 0 && !hasFilters && !creating

  const listBody = loading ? (
    <div className="space-y-px" role="status" aria-busy="true" aria-label={t('loading')}>
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className="border-b border-border px-4 py-3 last:border-b-0">
          <div className="skeleton h-3.5 w-2/3" />
          <div className="skeleton mt-2.5 h-3 w-full" />
          <div className="skeleton mt-1.5 h-3 w-4/5" />
        </div>
      ))}
    </div>
  ) : filteredNotes.length === 0 ? (
    <p className="px-4 py-12 text-center text-sm text-text-secondary">
      {searchQuery.trim() ? t('noResults') : t('noNotesHere')}
    </p>
  ) : (
    <NotesList
      notes={filteredNotes}
      selectedId={selectedNote?.id}
      showUpdated
      showMenu={false}
      onOpen={openNote}
      onDelete={handleDelete}
    />
  )

  return (
    <div className="min-w-0">
      <div
        ref={rootRef}
        className="flex min-w-0 flex-col gap-4 md:h-[var(--notes-h,calc(100dvh_-_9rem))] md:min-h-[30rem]"
      >
        <PageHeader
          title={t('title')}
          action={
            <div className="flex items-center gap-2">
              {projects.length > 0 ? (
                <IconMenu
                  label={t('fromTemplateTitle')}
                  buttonClassName="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-surface-hover sm:h-10 sm:w-10"
                  items={[{ label: t('fromTemplate'), onClick: () => setShowTemplates(true) }]}
                />
              ) : null}
              <Button
                type="button"
                onClick={openCreate}
                disabled={projects.length === 0}
                title={projects.length === 0 ? t('needProjectTitle') : t('newNoteTitle')}
                aria-label={t('newNote')}
                className="h-11 gap-2 sm:h-10"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('newNote')}</span>
              </Button>
            </div>
          }
        />

        {noProjects ? (
          <EmptyState title={t('noProjectsTitle')} body={t('noProjectsBody')} />
        ) : noNotesAtAll ? (
          <EmptyState
            title={t('emptyTitle')}
            body={t('emptyBody')}
            action={
              <Button type="button" onClick={openCreate} className="h-11 gap-2 sm:h-10">
                <Plus className="h-4 w-4" />
                {t('createNote')}
              </Button>
            }
          />
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 md:flex-row">
            <aside className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface md:min-h-0 md:w-[20rem] md:shrink-0 lg:w-[22rem] xl:w-[24rem]">
              <div className="space-y-2 border-b border-border p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="search"
                    enterKeyHint="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t('searchPlaceholder')}
                    aria-label={t('searchPlaceholder')}
                    className="h-11 w-full min-w-0 rounded-lg border border-border bg-secondary pl-9 pr-11 text-base text-text-primary sm:h-10 sm:pr-9 sm:text-sm transition-colors placeholder:text-text-muted hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary [&::-webkit-search-cancel-button]:hidden"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label={t('clearSearch')}
                      className="absolute right-0.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text-primary active:bg-tertiary sm:right-1.5 sm:h-7 sm:w-7"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  {workspaces.length > 1 ? (
                    <select
                      value={activeWorkspaceId}
                      aria-label={t('workspaceContext')}
                      title={t('workspaceContext')}
                      onChange={(event) => {
                        setActiveWorkspaceId(event.target.value)
                        setSelectedProjectId('')
                        setNotes([])
                        setProjects([])
                        setProjectsLoaded(false)
                        setCreating(false)
                        selectNote(null)
                      }}
                      className={selectClass}
                    >
                      {workspaces.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <select
                    value={selectedProjectId}
                    aria-label={t('categories.project')}
                    title={t('categories.project')}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    className={selectClass}
                  >
                    <option value="">{t('allProjects')}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!loading ? (
                  <p className="px-0.5 text-xs text-text-muted">{t('notesCount', { count: filteredNotes.length })}</p>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-b-2xl md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain">
                {listBody}
              </div>
            </aside>

            {paneOpen && workspaceId ? (
              <NotePane
                key={creating ? `create-${createKey}` : selectedNote?.id}
                note={creating ? null : selectedNote}
                workspaceId={workspaceId}
                projects={projects}
                defaultProjectId={selectedProjectId || (projects.length === 1 ? projects[0].id : '')}
                initialContent={templateContent}
                currentUserId={userId}
                shareUrl={
                  !creating && selectedNote
                    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/notes?note=${selectedNote.id}`
                    : undefined
                }
                onSave={creating ? handleCreate : handleUpdate}
                onDelete={handleDelete}
                onClose={closePane}
              />
            ) : (
              <div className="hidden min-w-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-8 text-center md:flex">
                <BookOpen className="h-8 w-8 text-text-muted" />
                <h2 className="mt-3 text-base font-semibold text-text-primary">{t('selectNoteTitle')}</h2>
                <p className="mt-1 max-w-xs text-sm text-text-secondary">{t('openNoteHint')}</p>
                <Button type="button" variant="secondary" onClick={openCreate} className="mt-5 gap-2">
                  <Plus className="h-4 w-4" />
                  {t('newNote')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {showTemplates && workspaceId ? (
        <TemplateSelector
          workspaceId={workspaceId}
          onSelect={(template) => {
            setTemplateContent(template.content)
            setCreateKey((key) => key + 1)
            setCreating(true)
          }}
          onClose={() => setShowTemplates(false)}
        />
      ) : null}
      {dialog}
    </div>
  )
}
