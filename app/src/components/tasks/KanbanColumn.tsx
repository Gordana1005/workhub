'use client';

import { useTranslations } from 'next-intl';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import { Task } from './types';

interface KanbanColumnProps {
  id: string;
  title: string;
  /** Tailwind background class for the status dot (theme token). */
  dotClass: string;
  tasks: Task[];
  selectedId?: string | null;
  onTaskClick?: (task: Task) => void;
}

export default function KanbanColumn({ id, title, dotClass, tasks, selectedId, onTaskClick }: KanbanColumnProps) {
  const t = useTranslations('pages.tasks');
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      aria-label={title}
      className={`flex h-full min-h-0 w-[17rem] shrink-0 snap-start flex-col rounded-xl border bg-background transition-colors lg:w-auto lg:min-w-0 lg:shrink ${
        isOver ? 'border-primary' : 'border-border'
      }`}
    >
      <header className="flex shrink-0 items-center gap-2 px-3 py-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium tabular-nums text-text-secondary">
          {tasks.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={`min-h-[8rem] flex-1 space-y-2 overflow-y-auto px-2 pb-2 transition-colors ${
          isOver ? 'bg-primary/5' : ''
        }`}
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">
              {t('dropTasksHere')}
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                selected={task.id === selectedId}
                onClick={() => onTaskClick?.(task)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}
