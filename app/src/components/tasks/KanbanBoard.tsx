'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { KanbanCardView } from './KanbanCard';
import { STATUSES, STATUS_DOT, compareTasks, statusLabel } from './taskUtils';
import { Task } from './types';

interface KanbanBoardProps {
  tasks: Task[];
  selectedId?: string | null;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void> | void;
  onTaskClick?: (task: Task) => void;
}

/**
 * Fills the height it is given: columns share the width equally from lg up (scroll
 * horizontally below that) and each column scrolls on its own.
 */
export default function KanbanBoard({ tasks, selectedId, onTaskUpdate, onTaskClick }: KanbanBoardProps) {
  const t = useTranslations('pages.tasks');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeTask = tasks.find((task) => task.id === active.id);
    const overId = over.id as string;
    // Dropping on a card resolves to that card's column
    const overColumnId = (STATUSES as readonly string[]).includes(overId)
      ? overId
      : tasks.find((task) => task.id === overId)?.status ?? overId;

    if (activeTask && activeTask.status !== overColumnId && (STATUSES as readonly string[]).includes(overColumnId)) {
      await onTaskUpdate(activeTask.id, { status: overColumnId });
    }
  };

  const tasksFor = (status: string) => tasks.filter((task) => task.status === status).sort(compareTasks);
  const activeTask = tasks.find((task) => task.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-[32rem] snap-x gap-3 overflow-x-auto pb-1 lg:grid lg:h-full lg:min-h-0 lg:grid-cols-4 lg:grid-rows-1lg:overflow-x-visible lg:pb-0">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            id={status}
            title={statusLabel(t, status)}
            dotClass={STATUS_DOT[status]}
            tasks={tasksFor(status)}
            selectedId={selectedId}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>{activeTask ? <KanbanCardView task={activeTask} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
