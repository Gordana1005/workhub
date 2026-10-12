'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { Task } from './types';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskClick?: (task: Task) => void;
}

const DEFAULT_COLUMNS = [
  { id: 'To Do', titleKey: 'statusToDo', color: 'from-gray-500 to-gray-600' },
  { id: 'In Progress', titleKey: 'statusInProgress', color: 'from-blue-500 to-blue-600' },
  { id: 'Review', titleKey: 'statusReview', color: 'from-yellow-500 to-yellow-600' },
  { id: 'Done', titleKey: 'statusDone', color: 'from-green-500 to-green-600' },
];

export default function KanbanBoard({ tasks, onTaskUpdate, onTaskClick }: KanbanBoardProps) {
  const t = useTranslations('pages.tasks');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeTask = tasks.find(t => t.id === active.id);
    const overId = over.id as string;
    // Dropping on a card resolves to that card's column
    const overColumnId = DEFAULT_COLUMNS.some(column => column.id === overId)
      ? overId
      : tasks.find(task => task.id === overId)?.status ?? overId;

    if (activeTask && activeTask.status !== overColumnId) {
      // Update task status
      await onTaskUpdate(activeTask.id, { status: overColumnId });
    }

    setActiveId(null);
  };

  const getTasksByColumn = (columnId: string) => {
    return tasks.filter(task => task.status === columnId);
  };

  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-w-0 max-w-full">
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{t('dragHint')}</span>
        </div>

        <div className="max-w-full min-w-0 overflow-x-auto pb-4">
          <div className="flex w-max gap-4">
            {DEFAULT_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={t(column.titleKey)}
                color={column.color}
                tasks={getTasksByColumn(column.id)}
                onTaskClick={onTaskClick}
              />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 opacity-50">
            <KanbanCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
