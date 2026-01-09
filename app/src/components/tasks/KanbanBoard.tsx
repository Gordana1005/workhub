'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { Task } from './types';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskClick?: (task: Task) => void;
}

const DEFAULT_COLUMNS = [
  { id: 'To Do', title: 'To Do', color: 'from-gray-500 to-gray-600' },
  { id: 'In Progress', title: 'In Progress', color: 'from-blue-500 to-blue-600' },
  { id: 'Review', title: 'Review', color: 'from-yellow-500 to-yellow-600' },
  { id: 'Done', title: 'Done', color: 'from-green-500 to-green-600' },
];

export default function KanbanBoard({ tasks, onTaskUpdate, onTaskClick }: KanbanBoardProps) {
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
    const overColumnId = over.id as string;

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
      <div className="bg-blue-500/10 border border-blue-500/20 text-blue-200 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
         <span className="text-xl">💡</span>
         <span>Drag and drop tasks between columns to update their status</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {DEFAULT_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            tasks={getTasksByColumn(column.id)}
            onTaskClick={onTaskClick}
          />
        ))}
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
