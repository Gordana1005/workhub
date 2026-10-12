'use client'

import { FileText } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { IconMenu } from '@/components/ui/IconMenu'

interface Note {
  id: string
  title: string
  content: string
  created_at: string
}

interface NoteCardProps {
  note: Note
  active?: boolean
  onOpen: (note: Note) => void
  onDelete: (id: string) => void
}

export default function NoteCard({ note, active, onOpen, onDelete }: NoteCardProps) {
  const t = useTranslations('pages.notes')
  const locale = useLocale()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return t('today')
    if (diffDays === 1) return t('yesterday')
    if (diffDays < 7) return t('daysAgo', { count: diffDays })
    return date.toLocaleDateString(locale === 'mk' ? 'mk-MK' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getPreview = (content: string) => {
    if (!content) return t('noContent')
    const strippedContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!strippedContent) return t('noContent')
    return strippedContent.slice(0, 150) + (strippedContent.length > 150 ? '...' : '')
  }

  return (
    <div
      className={`flex min-w-0 items-start gap-1 border-b border-border bg-surface px-2 py-2 last:border-b-0 ${
        active ? 'ring-1 ring-inset ring-primary' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(note)}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-hover"
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text-primary">{note.title}</span>
          <span className="mt-1 line-clamp-2 block text-xs text-text-secondary">{getPreview(note.content)}</span>
          <span className="mt-1.5 block text-xs text-text-muted">{formatDate(note.created_at)}</span>
        </span>
      </button>
      <IconMenu
        label={t('editNote')}
        items={[
          { label: t('editNote'), onClick: () => onOpen(note) },
          { label: t('deleteNote'), onClick: () => onDelete(note.id), danger: true },
        ]}
      />
    </div>
  )
}
