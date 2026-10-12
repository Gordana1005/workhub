'use client'

/**
 * AttachmentsTab: the "Files" tab of a task.
 * Drag & drop (or the Upload button, or a pasted image) -> direct-to-storage upload with progress,
 * then cards with a thumbnail (images open in a lightbox), name, size, uploader and date, and a
 * menu with Open / Download / Delete. Shows a clear "not set up yet" state when the table or the
 * storage bucket does not exist (see database/migrations/027_comments_attachments.sql).
 * It stays mounted while another tab is shown (`active=false`) so the tab badge keeps its count.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CloudUpload,
  Download,
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Paperclip,
  Presentation,
  RotateCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { useToast } from '@/components/ui/Toast'
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENT_BYTES,
  fileKind,
  formatBytes,
  isPreviewableImage,
  pastedImageName,
  validateAttachment,
  type FileKind,
} from '@/lib/attachments'
import {
  ATTACHMENTS_CHANGED_EVENT,
  AttachmentError,
  deleteTaskAttachment,
  downloadUrl,
  loadTaskAttachments,
  uploadTaskAttachment,
  type TaskAttachment,
} from '@/lib/attachments-client'
import { describeAttachmentError } from './attachmentMessages'
import type { MemberOption } from './types'

interface AttachmentsTabProps {
  workspaceId: string
  taskId: string
  currentUserId: string
  members: MemberOption[]
  /** Whether the tab is visible (drives paste handling and refreshing stale links). */
  active: boolean
  onCount?: (count: number) => void
}

interface UploadItem {
  key: string
  name: string
  progress: number
}

const CONCURRENCY = 3
/** Signed links last an hour; reload when the tab is reopened after this long. */
const STALE_MS = 20 * 60 * 1000

const KIND_ICON: Record<FileKind, typeof FileIcon> = {
  image: FileImage,
  pdf: FileText,
  document: FileText,
  text: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  archive: FileArchive,
  other: FileIcon,
}

function startDownload(url: string, name: string) {
  const a = document.createElement('a')
  a.href = downloadUrl(url, name)
  a.rel = 'noopener'
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

export default function AttachmentsTab({ workspaceId, taskId, currentUserId, members, active, onCount }: AttachmentsTabProps) {
  const t = useTranslations('pages.tasks')
  const format = useFormatter()
  const toast = useToast()
  const { confirm, dialog } = useConfirm()

  const [items, setItems] = useState<TaskAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [unavailable, setUnavailable] = useState<'table' | 'bucket' | null>(null)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(() => new Set())
  const [now, setNow] = useState(() => new Date())

  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const loadedAt = useRef(0)
  const onCountRef = useRef(onCount)
  onCountRef.current = onCount

  const me = members.find((member) => member.id === currentUserId)
  const isAdmin = me?.role === 'admin' || me?.role === 'owner'
  const notSetUp = unavailable !== null

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const result = await loadTaskAttachments(workspaceId, taskId)
        setItems(result.attachments)
        setUnavailable(result.unavailable)
        setLoadFailed(false)
        loadedAt.current = Date.now()
      } catch (error) {
        console.error('Error loading attachments:', error)
        if (!silent) setLoadFailed(true)
      } finally {
        setLoading(false)
      }
    },
    [workspaceId, taskId]
  )

  useEffect(() => {
    setItems([])
    setUploads([])
    setBrokenThumbs(new Set())
    load()
  }, [load])

  useEffect(() => {
    onCountRef.current?.(items.length)
  }, [items.length])

  // files attached elsewhere (e.g. pasted into a comment) show up here too
  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ taskId?: string }>).detail
      if (!detail || detail.taskId === taskId) load(true)
    }
    window.addEventListener(ATTACHMENTS_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(ATTACHMENTS_CHANGED_EVENT, onChanged)
  }, [taskId, load])

  // refresh expired signed links when the tab is reopened later
  useEffect(() => {
    if (active && loadedAt.current && Date.now() - loadedAt.current > STALE_MS) load(true)
    if (active) setNow(new Date())
  }, [active, load])

  const uploadOne = useCallback(
    async (file: File): Promise<boolean> => {
      const problem = validateAttachment(file)
      if (problem) {
        toast.error(describeAttachmentError(t, new AttachmentError(problem), file.name))
        return false
      }
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setUploads((prev) => [...prev, { key, name: file.name, progress: 0 }])
      try {
        const attachment = await uploadTaskAttachment({
          workspaceId,
          taskId,
          file,
          onProgress: (fraction) =>
            setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, progress: fraction } : u))),
        })
        setItems((prev) => [attachment, ...prev.filter((item) => item.id !== attachment.id)])
        return true
      } catch (error) {
        if (error instanceof AttachmentError && error.code === 'not_configured') setUnavailable('bucket')
        toast.error(describeAttachmentError(t, error, file.name))
        return false
      } finally {
        setUploads((prev) => prev.filter((u) => u.key !== key))
      }
    },
    [workspaceId, taskId, t, toast]
  )

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || notSetUp) return
      const queue = [...files]
      let done = 0
      const worker = async () => {
        for (let file = queue.shift(); file; file = queue.shift()) {
          if (await uploadOne(file)) done += 1
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
      if (done > 0) toast.success(t('attUploadDone', { count: done }))
    },
    [notSetUp, uploadOne, t, toast]
  )

  // paste an image anywhere while the tab is open (text fields keep their own paste)
  useEffect(() => {
    if (!active || notSetUp) return
    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return
      const files = Array.from(event.clipboardData?.files ?? [])
      if (files.length === 0) return
      event.preventDefault()
      addFiles(files.map((file) => (file.type.startsWith('image/') ? new File([file], pastedImageName(file.type), { type: file.type }) : file)))
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [active, notSetUp, addFiles])

  const hasFiles = (event: React.DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')

  const dropHandlers = notSetUp
    ? {}
    : {
        onDragEnter: (event: React.DragEvent) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          dragDepth.current += 1
          setDragging(true)
        },
        onDragOver: (event: React.DragEvent) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        },
        onDragLeave: (event: React.DragEvent) => {
          if (!hasFiles(event)) return
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setDragging(false)
        },
        onDrop: (event: React.DragEvent) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          dragDepth.current = 0
          setDragging(false)
          addFiles(Array.from(event.dataTransfer.files))
        },
      }

  const remove = async (item: TaskAttachment) => {
    const ok = await confirm({
      title: t('attConfirmDelete', { name: item.file_name }),
      body: t('attConfirmDeleteBody'),
      confirmLabel: t('delete'),
    })
    if (!ok) return
    try {
      await deleteTaskAttachment(workspaceId, item.id)
      setItems((prev) => prev.filter((entry) => entry.id !== item.id))
      setLightbox((current) => (current === item.id ? null : current))
    } catch (error) {
      console.error('Error deleting attachment:', error)
      toast.error(t('attDeleteFailed'))
    }
  }

  const relative = (iso?: string | null) => {
    if (!iso) return ''
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    return format.relativeTime(date, now < date ? date : now)
  }

  const images = useMemo(
    () => items.filter((item) => item.url && isPreviewableImage(item.file_name, item.file_type) && !brokenThumbs.has(item.id)),
    [items, brokenThumbs]
  )
  const lightboxIndex = lightbox ? images.findIndex((item) => item.id === lightbox) : -1
  const lightboxItem = lightboxIndex >= 0 ? images[lightboxIndex] : null

  const step = useCallback(
    (delta: number) => {
      if (images.length < 2 || lightboxIndex < 0) return
      setLightbox(images[(lightboxIndex + delta + images.length) % images.length].id)
    },
    [images, lightboxIndex]
  )

  useEffect(() => {
    if (!lightboxItem) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') step(-1)
      else if (event.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxItem, step])

  // a lightbox whose image vanished (deleted / failed to load) closes itself
  useEffect(() => {
    if (lightbox && lightboxIndex < 0) setLightbox(null)
  }, [lightbox, lightboxIndex])

  if (loading && items.length === 0) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label={t('loadingComments')}>
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-[4.5rem] w-full !rounded-xl" />
        ))}
      </div>
    )
  }

  if (notSetUp) {
    return (
      <EmptyState
        compact
        icon={<Paperclip />}
        title={t('attNotSetUpTitle')}
        body={t('attNotSetUpBody')}
      />
    )
  }

  const sizeLabel = formatBytes(MAX_ATTACHMENT_BYTES)

  return (
    <div className="relative space-y-3" {...dropHandlers}>
      <div
        className={`rounded-xl border border-dashed px-4 py-4 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/10' : 'border-border-strong bg-secondary/50'
        }`}
      >
        <CloudUpload className={`mx-auto h-6 w-6 ${dragging ? 'text-primary' : 'text-text-muted'}`} aria-hidden />
        <p className="mt-1.5 text-sm font-medium text-text-primary">
          {dragging ? t('attDropTitle') : t('attDropHint', { size: sizeLabel })}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">{t('attAllowedTypes')}</p>
        <div className="mt-3">
          <Button variant="secondary" size="sm" leftIcon={<CloudUpload />} onClick={() => inputRef.current?.click()}>
            {t('attChoose')}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              addFiles(files)
            }}
          />
        </div>
      </div>

      {uploads.length > 0 ? (
        <ul className="space-y-2" aria-live="polite">
          {uploads.map((upload) => {
            const percent = Math.round(upload.progress * 100)
            return (
              <li key={upload.key} className="rounded-xl border border-border bg-surface px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm text-text-primary">{t('attUploading', { name: upload.name })}</p>
                  <span className="shrink-0 text-xs tabular-nums text-text-muted">{percent}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={t('attProgress', { percent })}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-tertiary"
                >
                  <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${percent}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      {loadFailed ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
          <span className="min-w-0">{t('attLoadFailed')}</span>
          <Button variant="ghost" size="sm" onClick={() => load()} leftIcon={<RotateCw />}>
            {t('retry')}
          </Button>
        </div>
      ) : null}

      {items.length === 0 && uploads.length === 0 && !loadFailed ? (
        <EmptyState compact icon={<Paperclip />} title={t('attEmptyTitle')} body={t('attEmptyBody')} />
      ) : null}

      {items.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {items.map((item) => {
            const kind = fileKind(item.file_name, item.file_type)
            const Icon = KIND_ICON[kind]
            const previewable = !!item.url && isPreviewableImage(item.file_name, item.file_type) && !brokenThumbs.has(item.id)
            const uploader = members.find((member) => member.id === item.uploaded_by)?.username || t('unknownUser')
            const canDelete = item.uploaded_by === currentUserId || isAdmin
            const menuItems = [
              ...(item.url
                ? [
                    { label: t('attOpen'), icon: <ExternalLink />, onClick: () => window.open(item.url as string, '_blank', 'noopener') },
                    { label: t('attDownload'), icon: <Download />, onClick: () => startDownload(item.url as string, item.file_name) },
                  ]
                : []),
              ...(canDelete
                ? [{ label: t('attDeleteFile'), icon: <Trash2 />, onClick: () => remove(item), danger: true, separatorBefore: !!item.url }]
                : []),
            ]
            const thumb = previewable ? (
              <button
                type="button"
                onClick={() => setLightbox(item.id)}
                aria-label={t('attPreview', { name: item.file_name })}
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url as string}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={() => setBrokenThumbs((prev) => new Set(prev).add(item.id))}
                />
              </button>
            ) : (
              <span
                aria-hidden
                className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                <Icon className="h-6 w-6" />
              </span>
            )
            return (
              <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2 pr-1">
                {thumb}
                <div className="min-w-0 flex-1">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => {
                        if (previewable) {
                          event.preventDefault()
                          setLightbox(item.id)
                        }
                      }}
                      className="block truncate text-sm font-medium text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      title={item.file_name}
                    >
                      {item.file_name}
                    </a>
                  ) : (
                    <p className="truncate text-sm font-medium text-text-primary" title={item.file_name}>
                      {item.file_name}
                    </p>
                  )}
                  <p className="truncate text-xs text-text-muted">
                    {formatBytes(item.file_size)} · {t('attUploadedBy', { name: uploader, time: relative(item.created_at) })}
                  </p>
                </div>
                {menuItems.length > 0 ? (
                  <IconMenu
                    label={t('attActions')}
                    items={menuItems}
                    buttonClassName="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-surface-hover sm:h-9 sm:w-9"
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      <Dialog
        open={!!lightboxItem}
        onClose={() => setLightbox(null)}
        title={lightboxItem?.file_name || t('attLightbox')}
        size="xl"
        footer={
          lightboxItem?.url ? (
            <Button
              variant="secondary"
              leftIcon={<Download />}
              onClick={() => startDownload(lightboxItem.url as string, lightboxItem.file_name)}
            >
              {t('attDownload')}
            </Button>
          ) : undefined
        }
      >
        {lightboxItem ? (
          <div className="relative flex min-h-[40dvh] items-center justify-center rounded-xl bg-tertiary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxItem.url as string}
              alt={lightboxItem.file_name}
              className="max-h-[65dvh] w-auto max-w-full rounded-lg object-contain"
            />
            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={t('attPrev')}
                  className="absolute left-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-raised text-text-primary shadow-md hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={t('attNext')}
                  className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-raised text-text-primary shadow-md hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-surface-raised px-2.5 py-1 text-xs tabular-nums text-text-secondary shadow-sm">
                  {t('attPosition', { index: lightboxIndex + 1, total: images.length })}
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </Dialog>
      {dialog}
    </div>
  )
}
