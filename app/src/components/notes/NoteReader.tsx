'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, FolderOpen, Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { IconMenu } from '@/components/ui/IconMenu'
import VersionHistory from './VersionHistory'
import NoteContent from './NoteContent'
import { countWords, stripHtml, tagTint, useNoteDates, type NoteRecord } from './noteUtils'

interface NoteReaderProps {
  note: NoteRecord
  projectName?: string
  /** Author-only actions (edit, delete, restore). */
  canEdit?: boolean
  /** Absolute URL that opens this note; enables "Copy link". */
  shareUrl?: string
  onBack: () => void
  onEdit: () => void
  onDelete?: () => void
  onRestore?: (content: string, title: string) => void
}

interface OutlineItem {
  text: string
  level: number
}

const READ_TIME_MIN_WORDS = 120
const RAIL_MIN_WIDTH = 980

export default function NoteReader({
  note,
  projectName,
  canEdit = true,
  shareUrl,
  onBack,
  onEdit,
  onDelete,
  onRestore,
}: NoteReaderProps) {
  const t = useTranslations('pages.notes')
  const { full } = useNoteDates()
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [activeHeading, setActiveHeading] = useState(0)
  const [railFits, setRailFits] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasContent = Boolean(stripHtml(note.content)) || /<img\s/i.test(note.content || '')
  const updatedAt = note.updated_at || note.created_at
  const words = useMemo(() => countWords(note.content), [note.content])
  const tags = note.tags ?? []
  const authorName = note.author?.username || ''

  const scanOutline = useCallback(() => {
    const headings = contentRef.current?.querySelectorAll('h1, h2, h3')
    if (!headings) return
    setOutline(
      Array.from(headings)
        .map((heading) => ({ text: (heading.textContent || '').trim(), level: Number(heading.tagName.slice(1)) }))
        .filter((item) => item.text)
    )
  }, [])

  // Reset scroll position when switching notes.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    setActiveHeading(0)
  }, [note.id])

  // The outline rail only appears when the pane is wide enough to keep a comfortable reading column.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setRailFits(entry.contentRect.width >= RAIL_MIN_WIDTH))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const showRail = railFits && outline.length > 0

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !showRail) return
    const onScroll = () => {
      const headings = contentRef.current?.querySelectorAll('h1, h2, h3')
      if (!headings || headings.length === 0) return
      const top = el.getBoundingClientRect().top
      let current = 0
      headings.forEach((heading, index) => {
        if (heading.getBoundingClientRect().top - top <= 96) current = index
      })
      setActiveHeading(current)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [showRail, outline])

  const jumpTo = (index: number) => {
    const headings = contentRef.current?.querySelectorAll('h1, h2, h3')
    headings?.[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveHeading(index)
  }

  const copyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const menuItems: { label: string; onClick: () => void; danger?: boolean }[] = []
  menuItems.push({ label: t('versionHistory'), onClick: () => setShowHistory(true) })
  if (shareUrl) menuItems.push({ label: t('copyLink'), onClick: copyLink })
  if (canEdit && onDelete) menuItems.push({ label: t('deleteNote'), onClick: onDelete, danger: true })

  const metaBits: string[] = [t('updated', { when: full(updatedAt) })]
  if (authorName) metaBits.push(t('byAuthor', { name: authorName }))
  if (words >= READ_TIME_MIN_WORDS) metaBits.push(t('readTime', { minutes: Math.max(1, Math.round(words / 200)) }))

  return (
    <>
      <header className="flex shrink-0 items-center gap-1 border-b border-border px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3 md:pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          aria-label={t('back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2 px-1 text-sm text-text-secondary">
          {projectName ? (
            <>
              <FolderOpen className="h-4 w-4 shrink-0 text-text-muted" />
              <span className="truncate">{projectName}</span>
            </>
          ) : null}
        </div>

        {copied ? (
          <span
            role="status"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
          >
            <Check className="h-3.5 w-3.5" />
            {t('linkCopied')}
          </span>
        ) : null}

        {canEdit ? (
          <Button type="button" onClick={onEdit} className="shrink-0 gap-2">
            <Pencil className="h-4 w-4" />
            {t('edit')}
          </Button>
        ) : null}
        <IconMenu label={t('moreActions')} items={menuItems} />
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div
          className={`mx-auto flex w-full justify-center gap-12 px-5 sm:px-8 ${showRail ? 'max-w-[74rem]' : 'max-w-[58rem]'}`}
        >
          <article className="w-full min-w-0 max-w-[44rem] pb-32 pt-6 md:pt-12">
            <h1 className="break-words text-[1.75rem] font-bold leading-[1.2] tracking-tight text-text-primary sm:text-4xl">
              {note.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {projectName ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{projectName}</span>
                </span>
              ) : null}
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-text-primary"
                  style={{ backgroundColor: tagTint(tag.color) }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="truncate">{tag.name}</span>
                </span>
              ))}
            </div>

            <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[13px] text-text-muted">
              {metaBits.map((bit, index) => (
                <span key={bit} className="inline-flex items-center gap-2">
                  {index > 0 ? <span aria-hidden="true">·</span> : null}
                  {bit}
                </span>
              ))}
            </p>

            <hr className="mb-8 mt-6 border-border" />

            <div ref={contentRef}>
              {hasContent ? (
                <NoteContent html={note.content} onRendered={scanOutline} />
              ) : (
                <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
                  <p className="text-sm font-medium text-text-secondary">{t('emptyNote')}</p>
                  {canEdit ? <p className="mt-1 text-sm text-text-muted">{t('emptyNoteHint')}</p> : null}
                </div>
              )}
            </div>
          </article>

          {showRail ? (
            <aside className="hidden w-56 shrink-0 self-start md:sticky md:top-12 md:block md:pt-12" aria-label={t('onThisPage')}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t('onThisPage')}</p>
              <ul className="max-h-[calc(100dvh-14rem)] space-y-0.5 overflow-y-auto border-l border-border">
                {outline.map((item, index) => (
                  <li key={`${index}-${item.text}`}>
                    <button
                      type="button"
                      onClick={() => jumpTo(index)}
                      style={{ paddingLeft: `${0.75 + (item.level - 1) * 0.75}rem` }}
                      className={`-ml-px block w-full truncate border-l py-1 pr-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        index === activeHeading
                          ? 'border-primary font-medium text-primary'
                          : 'border-transparent text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>
      </div>

      {showHistory ? (
        <VersionHistory
          noteId={note.id}
          currentContent={note.content}
          currentTitle={note.title}
          onRestore={(content, title) => {
            if (canEdit) onRestore?.(content, title)
          }}
          onClose={() => setShowHistory(false)}
          canRestore={canEdit && Boolean(onRestore)}
        />
      ) : null}
    </>
  )
}
