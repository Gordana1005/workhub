'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, AlertCircle, User } from 'lucide-react';
import { format } from 'date-fns';
import { Task } from './types';

interface KanbanCardProps {
  task: Task;
  isDragging?: boolean;
  onClick?: () => void;
}

export default function KanbanCard({ task, isDragging = false, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const priorityColors = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card p-4 cursor-pointer hover:border-purple-500/50 transition-all ${
        isDragging ? 'rotate-3 opacity-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 mt-1"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Card Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="font-medium mb-2 line-clamp-2">{task.title}</h4>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Priority Badge */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
              <span className="text-gray-400 capitalize">{task.priority}</span>
            </div>

            {/* Due Date */}
            {task.due_date && (
              <div className="flex items-center gap-1 text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(task.due_date), 'MMM dd')}</span>
              </div>
            )}

            {/* Category */}
            {task.category && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                {task.category}
              </span>
            )}
          </div>

          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
              <User className="w-3 h-3" />
              <span>{task.assignee.full_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
