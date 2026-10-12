'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/Avatar';
import { PRIORITY_TONE, dayKey, isDone, isOverdue, parseDayKey, priorityLabel } from './taskUtils';
import { Task } from './types';

interface KanbanCardProps {
  task: Task;
  selected?: boolean;
  onClick?: () => void;
}

/** Visual card, shared by the sortable card and the drag overlay. */
export function KanbanCardView({
  task,
  selected = false,
  overlay = false,
  handle,
  onClick,
}: {
  task: Task;
  selected?: boolean;
  overlay?: boolean;
  handle?: React.ReactNode;
  onClick?: () => void;
}) {
  const t = useTranslations('pages.tasks');
  const format = useFormatter();
  const done = isDone(task);
  const overdue = isOverdue(task);
  const due = dayKey(task.due_date);
  const tone = PRIORITY_TONE[task.priority] || PRIORITY_TONE.medium;

  return (
    <div
      className={`group flex gap-1 rounded-lg border bg-surface p-2.5 shadow-sm transition-colors ${
        selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-text-muted/60'
      } ${overlay ? 'rotate-1 shadow-lg' : ''}`}
    >
      {handle}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick?.();
          }
        }}
        className="min-w-0 flex-1 cursor-pointer rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <p
          className={`line-clamp-2 break-words text-sm font-medium leading-snug ${
            done ? 'text-text-muted line-through' : 'text-text-primary'
          }`}
        >
          {task.title}
        </p>

        <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
          <span
            className={`inline-flex items-center gap-1 ${tone.text}`}
            title={priorityLabel(t, task.priority)}
          >
            <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden />
            <span className="sr-only">{priorityLabel(t, task.priority)}</span>
          </span>
          {task.project?.name ? (
            <span className="flex min-w-0 items-center gap-1">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-text-muted"
                style={task.project.color ? { backgroundColor: task.project.color } : undefined}
                aria-hidden
              />
              <span className="truncate">{task.project.name}</span>
            </span>
          ) : null}
          <span className="flex-1" />
          {due ? (
            <span className={`inline-flex shrink-0 items-center gap-1 ${overdue ? 'font-medium text-danger' : ''}`}>
              <Calendar className="h-3 w-3" aria-hidden />
              {format.dateTime(parseDayKey(due), { month: 'short', day: 'numeric' })}
            </span>
          ) : null}
          {task.assignee?.username ? (
            <Avatar alt={task.assignee.username} size="sm" className="h-5 w-5 text-[9px]" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function KanbanCard({ task, selected, onClick }: KanbanCardProps) {
  const t = useTranslations('pages.tasks');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <KanbanCardView
        task={task}
        selected={selected}
        onClick={onClick}
        handle={
          <button
            type="button"
            aria-label={t('dragTask')}
            {...attributes}
            {...listeners}
            className="-ml-1 mt-0.5 flex h-6 w-5 shrink-0 cursor-grab touch-none items-start justify-center rounded text-text-muted opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing group-hover:opacity-100"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}
