'use client'

import { Check } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { Avatar } from '@/components/ui/Avatar'
import { PRIORITY_TONE, dayKey, isDone, isOverdue, parseDayKey, priorityLabel, todayKey } from './taskUtils'
import type { Task } from './types'

interface TaskListRowProps {
  task: Task
  /** Keyboard cursor position. */
  cursor?: boolean
  /** Currently shown in the detail panel. */
  open?: boolean
  checked?: boolean
  selecting?: boolean
  onOpen: () => void
  onToggle: () => void
  onCheck: (checked: boolean) => void
}

/** Dense one-line task row for md+ screens (phones use the swipeable TaskRow). */
export default function TaskListRow({
  task,
  cursor,
  open,
  checked,
  selecting,
  onOpen,
  onToggle,
  onCheck,
}: TaskListRowProps) {
  const t = useTranslations('pages.tasks')
  const format = useFormatter()
  const done = isDone(task)
  const overdue = isOverdue(task)
  const due = dayKey(task.due_date)
  const tone = PRIORITY_TONE[task.priority] || PRIORITY_TONE.medium

  let dueText = ''
  if (due) {
    if (due === todayKey()) dueText = t('today')
    else if (due === todayKey(1)) dueText = t('tomorrow')
    else dueText = format.dateTime(parseDayKey(due), { month: 'short', day: 'numeric' })
  }

  return (
    <div
      data-task-id={task.id}
      onClick={onOpen}
      className={`group flex min-h-[2.75rem] cursor-pointer items-center gap-3 border-b border-border px-3 py-1.5 transition-colors last:border-b-0 ${
        open
          ? 'bg-primary/10'
          : cursor
            ? 'bg-surface-hover'
            : 'hover:bg-surface-hover'
      }`}
    >
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(event) => onCheck(event.target.checked)}
        onClick={(event) => event.stopPropagation()}
        aria-label={task.title}
        className={`h-4 w-4 shrink-0 accent-primary transition-opacity focus-visible:opacity-100 [@media(hover:none)]:opacity-100 ${
          selecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      />

      <button
        type="button"
        aria-label={done ? t('reopen') : t('markComplete')}
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          done
            ? 'border-success bg-success text-white'
            : 'border-text-muted text-transparent hover:border-success hover:text-success'
        }`}
      >
        <Check className="h-3 w-3" />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onOpen()
        }}
        className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span
          className={`block truncate text-sm ${
            done ? 'text-text-muted line-through' : 'font-medium text-text-primary'
          }`}
        >
          {task.title}
        </span>
      </button>

      {task.project?.name ? (
        <span className="hidden w-32 shrink-0 items-center gap-1.5 text-xs text-text-secondary lg:flex xl:w-40">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-text-muted"
            style={task.project.color ? { backgroundColor: task.project.color } : undefined}
            aria-hidden
          />
          <span className="truncate">{task.project.name}</span>
        </span>
      ) : (
        <span className="hidden w-32 shrink-0 lg:block xl:w-40" />
      )}

      <span className="flex w-5 shrink-0 justify-center" title={priorityLabel(t, task.priority)}>
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden />
        <span className="sr-only">{priorityLabel(t, task.priority)}</span>
      </span>

      <span className="hidden w-6 shrink-0 sm:block" title={task.assignee?.username}>
        {task.assignee?.username ? (
          <Avatar alt={task.assignee.username} size="sm" className="h-6 w-6 text-[10px]" />
        ) : null}
      </span>

      <span
        className={`w-16 shrink-0 text-right text-xs tabular-nums ${
          overdue ? 'font-medium text-danger' : due === todayKey() && !done ? 'font-medium text-primary' : 'text-text-muted'
        }`}
      >
        {dueText}
      </span>
    </div>
  )
}
