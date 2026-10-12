'use client'

import { FolderOpen } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { IconMenu } from '@/components/ui/IconMenu'
import { stripHtml, tagTint, useNoteDates, type NoteRecord } from './noteUtils'

interface NoteCardProps {
  note: NoteRecord
  active?: boolean
  /** Show the last-updated date instead of the created date */
  showUpdated?: boolean
  /** Show the project name (hide it when the list is already scoped to one project). */
  showProject?: boolean
  /** Show the per-card "..." menu. Hidden in the notes workspace, where actions live in the reader. */
  showMenu?: boolean
  onOpen: (note: NoteRecord) => void
  onDelete: (id: string) => void
}

const MAX_TAGS = 2

export default function NoteCard({
  note,
  active,
  showUpdated = false,
  showProject = true,
  showMenu = true,
  onOpen,
  onDelete,
}: NoteCardProps) {
  const t = useTranslations('pages.notes')
  const { relative } = useNoteDates()

  const preview = stripHtml(note.content)
  const projectName = showProject ? note.project?.name || '' : ''
  const tags = note.tags ?? []
  const hiddenTags = Math.max(0, tags.length - MAX_TAGS)

  return (
    <div
      className={`relative flex min-w-0 items-start border-b border-border transition-colors last:border-b-0 ${
        active ? 'bg-primary/10' : 'bg-surface hover:bg-surface-hover'
      }`}
    >
      {active ? <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden="true" /> : null}

      <button
        type="button"
        onClick={() => onOpen(note)}
        aria-current={active ? 'true' : undefined}
        className="block min-h-[4.5rem] min-w-0 flex-1 px-4 py-3 text-left active:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <span className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text-primary sm:text-sm">
            {note.title || t('untitled')}
          </span>
          <span className="shrink-0 text-xs text-text-muted">
            {relative(showUpdated ? note.updated_at || note.created_at : note.created_at)}
          </span>
        </span>

        <span className="mt-1 line-clamp-2 block break-words text-[13px] leading-snug text-text-secondary">
          {preview ? preview.slice(0, 180) : <span className="italic text-text-muted">{t('noContent')}</span>}
        </span>

        {projectName || tags.length > 0 ? (
          <span className="mt-2 flex min-w-0 items-center gap-2 overflow-hidden">
            {projectName ? (
              <span className="inline-flex min-w-0 shrink items-center gap-1 text-xs text-text-muted">
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{projectName}</span>
              </span>
            ) : null}
            {tags.slice(0, MAX_TAGS).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex max-w-[7rem] shrink-0 items-center gap-1 rounded-full px-2 py-px text-[11px] font-medium text-text-secondary"
                style={{ backgroundColor: tagTint(tag.color) }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="truncate">{tag.name}</span>
              </span>
            ))}
            {hiddenTags > 0 ? <span className="shrink-0 text-[11px] text-text-muted">+{hiddenTags}</span> : null}
          </span>
        ) : null}
      </button>

      {showMenu ? (
        <div className="shrink-0 pr-1 pt-1">
          <IconMenu
            label={t('moreActions')}
            buttonClassName="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-surface-hover sm:h-9 sm:w-9"
            items={[
              { label: t('openNote'), onClick: () => onOpen(note) },
              { label: t('deleteNote'), onClick: () => onDelete(note.id), danger: true },
            ]}
          />
        </div>
      ) : null}
    </div>
  )
}
