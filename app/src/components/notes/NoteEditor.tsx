'use client'

import { useState } from 'react'
import { ArrowLeft, History, Save, X } from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import TagSelector from './TagSelector'
import VersionHistory from './VersionHistory'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'

interface Tag {
  id: string
  name: string
  color: string
}

interface Project {
  id: string
  name: string
}

interface NoteEditorProps {
  initialTitle?: string
  initialContent?: string
  initialTags?: Tag[]
  initialProjectId?: string
  projects?: Project[]
  noteId?: string
  workspaceId: string
  onSave: (title: string, content: string, tags: Tag[], projectId: string) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
}

const fieldClass =
  'w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export default function NoteEditor({
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  initialProjectId = '',
  projects = [],
  noteId,
  workspaceId,
  onSave,
  onCancel,
  isEdit = false,
}: NoteEditorProps) {
  const t = useTranslations('pages.notes')
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId)
  const [isSaving, setIsSaving] = useState(false)
  const [projectError, setProjectError] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    if (!selectedProjectId) {
      setProjectError(true)
      return
    }

    setIsSaving(true)
    try {
      await onSave(title, content, tags, selectedProjectId)
    } catch (error) {
      console.error('Failed to save note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestore = (restoredContent: string, restoredTitle: string) => {
    setContent(restoredContent)
    setTitle(restoredTitle)
  }

  return (
    <div className="fixed inset-0 z-[80] flex min-h-0 min-w-0 flex-col bg-surface text-text-primary lg:static lg:inset-auto lg:z-auto lg:max-h-[calc(100dvh-16rem)] lg:min-h-[28rem] lg:w-full lg:rounded-2xl lg:border lg:border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover lg:hidden"
          aria-label={t('back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">
          {isEdit ? t('editorTitleEdit') : t('newNote')}
        </h2>
        {isEdit && noteId ? (
          <button
            type="button"
            onClick={() => setShowVersionHistory(true)}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            title={t('versionHistory')}
            aria-label={t('versionHistory')}
          >
            <History className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCancel}
          className="hidden rounded-lg p-2 text-text-secondary hover:bg-surface-hover lg:inline-flex"
          aria-label={t('close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="note-project">
            {t('project')}
          </label>
          <select
            id="note-project"
            value={selectedProjectId}
            onChange={(event) => {
              setSelectedProjectId(event.target.value)
              setProjectError(false)
            }}
            className={fieldClass}
          >
            <option value="" disabled>
              {t('selectProject')}
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {projectError ? <p className="mt-1.5 text-sm text-danger">{t('selectProjectAlert')}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="note-title">
            {t('noteTitle')}
          </label>
          <input
            id="note-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('noteTitlePlaceholder')}
            className={`${fieldClass} text-base`}
            autoFocus
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-text-secondary">{t('tags')}</p>
          <TagSelector workspaceId={workspaceId} selectedTags={tags} onChange={setTags} />
        </div>

        <div className="min-w-0">
          <p className="mb-1.5 text-sm font-medium text-text-secondary">{t('content')}</p>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder={t('contentPlaceholder')}
            editable
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
          {t('cancel')}
        </Button>
        <Button type="button" onClick={handleSave} disabled={!title.trim() || isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? t('saving') : t('saveNote')}
        </Button>
      </div>

      {showVersionHistory && noteId ? (
        <VersionHistory
          noteId={noteId}
          currentContent={content}
          currentTitle={title}
          onRestore={handleRestore}
          onClose={() => setShowVersionHistory(false)}
        />
      ) : null}
    </div>
  )
}
