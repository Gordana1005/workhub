'use client'

import { useEffect, useState, useCallback } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import NotesList from '@/components/notes/NotesList'
import NoteEditor from '@/components/notes/NoteEditor'
import TemplateSelector from '@/components/notes/TemplateSelector'
import { Plus, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'

interface Tag {
  id: string
  name: string
  color: string
}

interface Note {
  id: string
  title: string
  content: string
  created_at: string
  project_id?: string
  tags?: Tag[]
}

interface Project {
  id: string
  name: string
}

const fieldClass =
  'w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export default function NotesPage() {
  const t = useTranslations('pages.notes')
  const { currentWorkspace, workspaces } = useWorkspaceStore()
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('')
  const [notes, setNotes] = useState<Note[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [templateContent, setTemplateContent] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    if (currentWorkspace && !activeWorkspaceId) {
      setActiveWorkspaceId(currentWorkspace.id)
    }
  }, [currentWorkspace, activeWorkspaceId])

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
    }
  }, [activeWorkspaceId, currentWorkspace?.id])

  const loadNotes = useCallback(async () => {
    const wsId = activeWorkspaceId || currentWorkspace?.id
    if (!wsId) return

    try {
      setLoading(true)

      const url = selectedProjectId
        ? `/api/notes?projectId=${selectedProjectId}`
        : `/api/notes?workspaceId=${wsId}`

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setNotes(data || [])
      } else {
        console.error('Error loading notes:', data.error)
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    } finally {
      setLoading(false)
    }
  }, [activeWorkspaceId, currentWorkspace?.id, selectedProjectId])

  useEffect(() => {
    if (activeWorkspaceId) {
      loadProjects()
      loadNotes()
    }
  }, [activeWorkspaceId, loadNotes, loadProjects])

  const workspaceId = activeWorkspaceId || currentWorkspace?.id || ''
  const editorOpen = creating || editingNote !== null

  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase()
    const content = note.content || ''
    return note.title.toLowerCase().includes(query) || content.toLowerCase().includes(query)
  })

  const closeEditor = () => {
    setCreating(false)
    setEditingNote(null)
    setTemplateContent('')
  }

  const openCreate = () => {
    if (projects.length === 0) return
    setEditingNote(null)
    setTemplateContent('')
    setEditorKey((key) => key + 1)
    setCreating(true)
  }

  const openNote = (note: Note) => {
    setCreating(false)
    setTemplateContent('')
    setEditingNote(note)
  }

  const handleCreate = async (title: string, content: string, tags: Tag[], targetProjectId: string) => {
    const finalProjectId = targetProjectId || selectedProjectId
    if (!finalProjectId) return

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: finalProjectId, title, content, tags }),
      })

      if (res.ok) {
        closeEditor()
        loadNotes()
      }
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleUpdate = async (title: string, content: string, tags: Tag[]) => {
    if (!editingNote) return

    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingNote.id, title, content, tags }),
      })

      if (res.ok) {
        closeEditor()
        loadNotes()
      }
    } catch (error) {
      console.error('Failed to update note:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return

    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })

      if (res.ok) {
        if (editingNote?.id === id) closeEditor()
        loadNotes()
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const showSplit = !loading && projects.length > 0 && (filteredNotes.length > 0 || editorOpen)

  return (
    <div className="min-w-0 space-y-6">
      <div className={editorOpen ? 'max-lg:hidden' : ''}>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={
          <div className="flex items-center gap-1">
            {projects.length > 0 ? (
              <IconMenu
                label={t('fromTemplateTitle')}
                items={[{ label: t('fromTemplate'), onClick: () => setShowTemplates(true) }]}
              />
            ) : null}
            <Button
              type="button"
              onClick={openCreate}
              disabled={projects.length === 0}
              title={projects.length === 0 ? t('needProjectTitle') : t('newNoteTitle')}
              aria-label={t('newNote')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('newNote')}</span>
            </Button>
          </div>
        }
      />
      </div>

      <div className={`grid min-w-0 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_minmax(0,12rem)] ${editorOpen ? 'max-lg:hidden' : ''}`}>
        <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className={`${fieldClass} pl-9`}
          />
        </div>

        <label className="block min-w-0 text-xs font-medium text-text-secondary">
          {t('workspaceContext')}
          <select
            value={activeWorkspaceId}
            onChange={(event) => {
              setActiveWorkspaceId(event.target.value)
              setSelectedProjectId('')
              closeEditor()
            }}
            className={`${fieldClass} mt-1`}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block min-w-0 text-xs font-medium text-text-secondary">
          {t('categories.project')}
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className={`${fieldClass} mt-1`}
          >
            <option value="">{t('allProjects')}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex min-w-0 flex-col lg:flex-row lg:items-start lg:gap-4">
        <section className={`min-w-0 ${editorOpen ? 'max-lg:hidden' : ''} ${showSplit ? 'lg:w-80 lg:shrink-0' : 'w-full'}`}>
          {loading ? (
            <p className="rounded-2xl border border-border bg-surface px-4 py-12 text-center text-sm text-text-secondary">
              {t('loading')}
            </p>
          ) : projects.length === 0 ? (
            <EmptyState title={t('noProjectsTitle')} body={t('noProjectsBody')} />
          ) : notes.length === 0 ? (
            <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />
          ) : filteredNotes.length === 0 ? (
            <p className="rounded-2xl border border-border bg-surface px-4 py-12 text-center text-sm text-text-secondary">
              {t('noResults')}
            </p>
          ) : (
            <div className="max-w-full rounded-2xl border border-border bg-surface">
              <NotesList
                notes={filteredNotes}
                selectedId={editingNote?.id}
                onOpen={openNote}
                onDelete={handleDelete}
              />
            </div>
          )}
        </section>

        {showSplit ? (
          <section className={`min-w-0 lg:flex-1 ${editorOpen ? '' : 'max-lg:hidden'}`}>
            {editorOpen && workspaceId ? (
              <NoteEditor
                key={editingNote?.id ?? `create-${editorKey}`}
                workspaceId={workspaceId}
                noteId={editingNote?.id}
                initialTitle={editingNote?.title ?? ''}
                initialContent={editingNote?.content ?? templateContent}
                initialTags={editingNote?.tags ?? []}
                initialProjectId={editingNote?.project_id ?? selectedProjectId}
                projects={projects}
                onSave={editingNote ? handleUpdate : handleCreate}
                onCancel={closeEditor}
                isEdit={Boolean(editingNote)}
              />
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border bg-surface p-6 text-center">
                <p className="text-sm text-text-secondary">{t('openNoteHint')}</p>
              </div>
            )}
          </section>
        ) : null}
      </div>

      {showTemplates && workspaceId ? (
        <TemplateSelector
          workspaceId={workspaceId}
          onSelect={(template) => {
            setTemplateContent(template.content)
            setEditingNote(null)
            setEditorKey((key) => key + 1)
            setCreating(true)
          }}
          onClose={() => setShowTemplates(false)}
        />
      ) : null}
    </div>
  )
}
