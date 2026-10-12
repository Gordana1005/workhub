'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { IconMenu } from '@/components/ui/IconMenu'
import { daysUntil, parseDay } from './projectUtils'

export interface ProjectTask {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  is_completed: boolean
  category: string | null
  assignee_id?: string | null
  assignee?: { id?: string; username: string } | null
}

export default function ProjectTaskRow({
  task,
  assigneeAvatar,
  onOpen,
  onToggle,
  onDelete,
}: {
  task: ProjectTask
  assigneeAvatar?: string | null
  onOpen: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const t = useTranslations('pages.projects')
  const locale = useLocale()
  const done = task.is_completed
  const day = parseDay(task.due_date)
  const diff = daysUntil(task.due_date)
  const dateText = day ? day.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) : ''
  const dueTone = done
    ? 'text-text-muted'
    : diff !== null && diff < 0
      ? 'font-medium text-danger'
      : diff === 0
        ? 'font-medium text-warning'
        : 'text-text-secondary'
  const showPriority = !done && (task.priority === 'urgent' || task.priority === 'high')
  const assigneeName = task.assignee?.username

  const detail = [
    showPriority ? t(`priority.${task.priority}`) : null,
    task.category,
    dateText || null,
    assigneeName,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="group flex items-center gap-1 px-2 py-1.5 transition-colors duration-150 hover:bg-surface-hover sm:px-3">
      <button
        type="button"
        aria-label={done ? t('markIncomplete') : t('markComplete')}
        aria-pressed={done}
        onClick={onToggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
            done
              ? 'border-primary bg-primary text-white'
              : 'border-text-muted text-transparent group-hover:border-primary'
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className={`block truncate text-sm font-medium ${done ? 'text-text-muted line-through' : 'text-text-primary'}`}>
          {task.title}
        </span>
        {detail ? <span className="mt-0.5 block truncate text-xs text-text-muted md:hidden">{detail}</span> : null}
      </button>

      <div className="hidden shrink-0 items-center gap-3 pr-1 md:flex">
        {task.category ? (
          <span className="max-w-[9rem] truncate rounded-full bg-background px-2 py-0.5 text-xs text-text-secondary">
            {task.category}
          </span>
        ) : null}
        {showPriority ? (
          <Badge size="sm" variant={task.priority === 'urgent' ? 'danger' : 'warning'}>
            {t(`priority.${task.priority}`)}
          </Badge>
        ) : null}
        <span className={`w-16 text-right text-xs tabular-nums ${dueTone}`}>{dateText}</span>
        <span className="flex w-6 justify-center" title={assigneeName || undefined}>
          {assigneeName ? (
            <Avatar
              src={assigneeAvatar}
              alt={assigneeName}
              fallback={assigneeName.slice(0, 2).toUpperCase()}
              size="sm"
              className="h-6 w-6 text-[10px]"
            />
          ) : null}
        </span>
      </div>

      <IconMenu
        label={`${t('taskActions')}: ${task.title}`}
        items={[
          { label: t('editTask'), onClick: onOpen },
          { label: done ? t('markIncomplete') : t('markComplete'), onClick: onToggle },
          { label: t('deleteTask'), onClick: onDelete, danger: true },
        ]}
      />
    </li>
  )
}
