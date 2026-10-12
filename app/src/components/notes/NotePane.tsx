'use client'

import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { useTranslations } from 'next-intl'
import NoteEditor from './NoteEditor'
import NoteReader from './NoteReader'
import type { NoteProject, NoteRecord, NoteTag } from './noteUtils'

interface NotePaneProps {
  /** The note to show. Leave empty to create a new one (opens straight in the editor). */
  note?: NoteRecord | null
  workspaceId: string
  projects: NoteProject[]
  /** Project preselected for a new note. */
  defaultProjectId?: string
  /** Starting content for a new note (e.g. from a template). */
  initialContent?: string
  /** Open an existing note directly in the editor. */
  startInEdit?: boolean
  /** Used to hide edit/delete for notes the user did not write (the API only allows authors). */
  currentUserId?: string | null
  /** Viewport at which the pane stops being a full-screen overlay and sits in the layout. */
  fullScreenBelow?: 'md' | 'lg'
  /** Absolute URL that opens this note (enables "Copy link"). */
  shareUrl?: string
  className?: string
  onSave: (title: string, content: string, tags: NoteTag[], projectId: string) => Promise<void>
  onDelete?: (id: string) => void
  /** Leave the pane: back to the list on phones, or dismiss a new-note draft. */
  onClose: () => void
}

const shellClass = {
  md: 'fixed inset-0 z-[80] flex min-h-0 min-w-0 flex-col bg-surface text-text-primary md:static md:inset-auto md:z-auto md:flex-1 md:rounded-2xl md:border md:border-border',
  lg: 'fixed inset-0 z-[80] flex min-h-0 min-w-0 flex-col bg-surface text-text-primary lg:static lg:inset-auto lg:z-auto lg:flex-1 lg:rounded-2xl lg:border lg:border-border',
} as const

/**
 * One note, two modes: a typeset reading view (default for existing notes) and
 * the editor, swapped in place. New notes open straight in the editor.
 */
export default function NotePane({
  note,
  workspaceId,
  projects,
  defaultProjectId = '',
  initialContent = '',
  startInEdit = false,
  currentUserId,
  fullScreenBelow = 'md',
  shareUrl,
  className,
  onSave,
  onDelete,
  onClose,
}: NotePaneProps) {
  const t = useTranslations('pages.notes')
  const [mode, setMode] = useState<'read' | 'edit'>(!note || startInEdit ? 'edit' : 'read')
  const [draft, setDraft] = useState<{ title: string; content: string } | null>(null)
  const [editSession, setEditSession] = useState(0)
  // What we just saved, so the reader is right even before the parent has refreshed its list.
  const [saved, setSaved] = useState<Partial<NoteRecord> | null>(null)

  useEffect(() => {
    setSaved(null)
  }, [note])

  const current: NoteRecord | null = note ? { ...note, ...(saved ?? {}) } : null
  const canEdit = !current || !currentUserId || !current.author_id || current.author_id === currentUserId
  const projectName =
    projects.find((project) => project.id === current?.project_id)?.name || current?.project?.name || undefined

  const startEdit = () => {
    setDraft(null)
    setEditSession((value) => value + 1)
    setMode('edit')
  }

  const handleSave = async (title: string, content: string, tags: NoteTag[], projectId: string) => {
    await onSave(title, content, tags, projectId)
    if (note) {
      setSaved({ title, content, tags, updated_at: new Date().toISOString() })
      setDraft(null)
      setMode('read')
    }
  }

  const handleCancel = () => {
    if (!note) {
      onClose()
      return
    }
    setDraft(null)
    setMode('read')
  }

  return (
    <section className={twMerge(shellClass[fullScreenBelow], className)}>
      {mode === 'edit' || !current ? (
        <NoteEditor
          key={current ? `edit-${current.id}-${editSession}` : 'create'}
          embedded
          workspaceId={workspaceId}
          noteId={current?.id}
          initialTitle={current?.title ?? ''}
          initialContent={current?.content ?? initialContent}
          initialTags={current?.tags ?? []}
          initialProjectId={current?.project_id ?? defaultProjectId}
          draft={draft}
          notice={draft ? t('restoredNotice') : undefined}
          projects={projects}
          onSave={handleSave}
          onCancel={handleCancel}
          isEdit={Boolean(current)}
        />
      ) : (
        <NoteReader
          key={current.id}
          note={current}
          projectName={projectName}
          canEdit={canEdit}
          shareUrl={shareUrl}
          onBack={onClose}
          onEdit={startEdit}
          onDelete={onDelete ? () => onDelete(current.id) : undefined}
          onRestore={(content, title) => {
            setDraft({ title, content })
            setEditSession((value) => value + 1)
            setMode('edit')
          }}
        />
      )}
    </section>
  )
}
