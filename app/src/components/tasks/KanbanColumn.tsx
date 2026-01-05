'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import { Task } from './types';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export default function KanbanColumn({ id, title, color, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-shrink-0 w-80">
      <div className="card p-4">
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${color}`} />
            <h3 className="font-semibold text-lg">{title}</h3>
            <span className="text-sm text-gray-400">({tasks.length})</span>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          ref={setNodeRef}
          className={`min-h-[400px] space-y-3 transition-all ${
            isOver ? 'bg-purple-500/10 rounded-lg p-2' : ''
          }`}
        >
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                Drop tasks here
              </div>
            ) : (
              tasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                />
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}
