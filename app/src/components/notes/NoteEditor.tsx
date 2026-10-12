'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, ChevronDown, FolderOpen, History, Info, Save } from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import TagSelector from './TagSelector'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'

const VersionHistory = dynamic(() => import('./VersionHistory'), { ssr: false })

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
  /**
   * When true the editor fills whatever pane contains it (NotePane does the
   * full-screen/phone handling). When false it brings its own container.
   */
  embedded?: boolean
  /** Unsaved starting point (e.g. a restored version). Dirty tracking still compares against the initial* values. */
  draft?: { title: string; content: string } | null
  /** Optional informational banner shown above the title (e.g. after restoring a version). */
  notice?: string
}

function sameTags(a: Tag[], b: Tag[]) {
  if (a.length !== b.length) return false
  const ids = new Set(a.map((tag) => tag.id))
  return b.every((tag) => ids.has(tag.id))
}

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
  embedded = false,
  draft,
  notice,
}: NoteEditorProps) {
  const t = useTranslations('pages.notes')
  const { confirm, dialog } = useConfirm()
  const [title, setTitle] = useState(draft?.title ?? initialTitle)
  const [content, setContent] = useState(draft?.content ?? initialContent)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId)
  const [isSaving, setIsSaving] = useState(false)
  const [projectError, setProjectError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const dirty =
    title !== initialTitle ||
    content !== initialContent ||
    !sameTags(tags, initialTags) ||
    (!isEdit && selectedProjectId !== initialProjectId)

  // Title grows with its text so long titles wrap instead of scrolling sideways.
  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  useEffect(() => {
    if (!(draft?.title ?? initialTitle)) titleRef.current?.focus()
  }, [initialTitle, draft])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Android back button / back gesture: on phones and tablets the editor is a full-screen layer, so
  // "back" should leave the editor (asking first when there are unsaved changes), not the page.
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const guardRef = useRef({ confirm, onCancel, title: t('discardConfirm'), label: t('discard') })
  guardRef.current = { confirm, onCancel, title: t('discardConfirm'), label: t('discard') }

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return
    const marker = `note-editor-${noteId ?? 'new'}-${Date.now()}`
    let pushed = false
    let closing = false
    const push = () => {
      try {
        window.history.pushState({ ...(window.history.state || {}), __noteEditor: marker }, '', window.location.href)
        pushed = true
      } catch {
        // history is a nicety only
      }
    }
    // deferred so React strict-mode's mount/unmount/mount only pushes once
    const timer = window.setTimeout(push, 0)

    const onPop = async () => {
      if (closing) return
      pushed = false
      if (!dirtyRef.current) {
        guardRef.current.onCancel()
        return
      }
      push() // stay on the editor while we ask
      const { confirm: ask, title: question, label } = guardRef.current
      if (await ask({ title: question, confirmLabel: label })) {
        closing = true
        pushed = false
        window.history.go(-1)
        guardRef.current.onCancel()
      }
    }
    window.addEventListener('popstate', onPop)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('popstate', onPop)
      if (pushed && window.history.state?.__noteEditor === marker) {
        closing = true
        window.history.back()
      }
    }
  }, [noteId])

  const handleSave = async () => {
    if (isSaving) return
    if (!title.trim()) {
      titleRef.current?.focus()
      return
    }
    if (!selectedProjectId) {
      setProjectError(true)
      return
    }

    setIsSaving(true)
    setSaveError(false)
    try {
      await onSave(title.trim(), content, tags, selectedProjectId)
    } catch (error) {
      console.error('Failed to save note:', error)
      setSaveError(true)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = async () => {
    if (dirty && !(await confirm({ title: t('discardConfirm'), confirmLabel: t('discard') }))) return
    onCancel()
  }

  const handleRestore = (restoredContent: string, restoredTitle: string) => {
    setContent(restoredContent)
    setTitle(restoredTitle)
  }

  const rootClass = embedded
    ? 'flex min-h-0 min-w-0 flex-1 flex-col bg-surface text-text-primary'
    : 'fixed inset-0 z-[80] flex min-h-0 min-w-0 flex-col bg-surface text-text-primary lg:static lg:inset-auto lg:z-auto lg:h-[calc(100dvh-14rem)] lg:min-h-[28rem] lg:w-full lg:rounded-2xl lg:border lg:border-border'
  const backClass = embedded ? 'md:hidden' : 'lg:hidden'

  const documentHeader = (
    <div className="mb-6">
      {notice ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-border bg-surface-hover px-3 py-2.5 text-sm text-text-secondary">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {notice}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <FolderOpen className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <select
            id="note-project"
            value={selectedProjectId}
            disabled={isEdit}
            aria-label={t('categories.project')}
            aria-invalid={projectError}
            onChange={(event) => {
              setSelectedProjectId(event.target.value)
              setProjectError(false)
            }}
            className={`h-10 max-w-[14rem] appearance-none rounded-full border bg-surface-hover pl-8 pr-8 text-base font-medium sm:h-8 sm:text-xs text-text-primary transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-default disabled:opacity-100 ${
              projectError ? 'border-danger' : 'border-border hover:border-primary/50'
            }`}
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
          {isEdit ? null : (
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          )}
        </div>

        <TagSelector workspaceId={workspaceId} selectedTags={tags} onChange={setTags} />
      </div>
      {projectError ? <p className="mb-3 text-sm text-danger">{t('selectProjectAlert')}</p> : null}

      <textarea
        ref={titleRef}
        id="note-title"
        rows={1}
        value={title}
        aria-label={t('noteTitle')}
        placeholder={t('noteTitlePlaceholder')}
        onChange={(event) => setTitle(event.target.value.replace(/\n/g, ' '))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            bodyRef.current?.querySelector<HTMLElement>('.ProseMirror')?.focus()
          }
        }}
        className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[1.75rem] font-bold leading-[1.2] tracking-tight text-text-primary placeholder:text-text-muted/70 focus:outline-none focus:ring-0 sm:text-4xl"
      />
      <hr className="mt-5 border-border" />
    </div>
  )

  return (
    <div
      className={rootClass}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault()
          void handleSave()
        }
      }}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-border px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3 lg:pt-2">
        <button
          type="button"
          onClick={handleCancel}
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${backClass}`}
          aria-label={t('back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
          <h2 className="truncate text-sm font-semibold text-text-primary">
            {isEdit ? t('editorTitleEdit') : t('newNote')}
          </h2>
          {dirty ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
              <span className="hidden sm:inline">{t('unsavedChanges')}</span>
            </span>
          ) : null}
        </div>

        {isEdit && noteId ? (
          <button
            type="button"
            onClick={() => setShowVersionHistory(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-10 sm:w-10"
            title={t('versionHistory')}
            aria-label={t('versionHistory')}
          >
            <History className="h-4 w-4" />
          </button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving}
          className={`shrink-0 ${embedded ? 'max-md:hidden' : 'max-lg:hidden'}`}
        >
          {t('cancel')}
        </Button>
        <Button type="button" onClick={handleSave} disabled={!title.trim() || isSaving} className="h-11 shrink-0 gap-2 sm:h-10">
          <Save className="h-4 w-4" />
          {isSaving ? t('saving') : t('save')}
        </Button>
      </header>

      {saveError ? (
        <p role="alert" className="shrink-0 border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {t('saveFailed')}
        </p>
      ) : null}

      <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col">
        <RichTextEditor
          layout="fill"
          content={content}
          onChange={setContent}
          placeholder={t('contentPlaceholder')}
          header={documentHeader}
          editable
        />
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
      {dialog}
    </div>
  )
}
