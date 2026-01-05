'use client';

import { useState } from 'react';
import { CheckSquare, Trash2, Tag, User, FolderInput, X } from 'lucide-react';

interface BulkActionsProps {
  selectedTasks: string[];
  onClearSelection: () => void;
  onBulkComplete: () => void;
  onBulkDelete: () => void;
  onBulkChangePriority?: (priority: string) => void;
  onBulkAssign?: (userId: string) => void;
  onBulkMove?: (projectId: string) => void;
}

export default function BulkActions({
  selectedTasks,
  onClearSelection,
  onBulkComplete,
  onBulkDelete,
  onBulkChangePriority,
  onBulkAssign,
  onBulkMove
}: BulkActionsProps) {
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  if (selectedTasks.length === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
      <div className="card px-6 py-4 flex items-center gap-4 shadow-2xl animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-purple-400" />
          <span className="font-semibold">
            {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="h-6 w-px bg-white/10" />

        <div className="flex items-center gap-2">
          {/* Complete Button */}
          <button
            onClick={onBulkComplete}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center gap-2"
            title="Mark as complete"
          >
            <CheckSquare className="w-4 h-4" />
            Complete
          </button>

          {/* Priority Button */}
          {onBulkChangePriority && (
            <div className="relative">
              <button
                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center gap-2"
                title="Change priority"
              >
                <Tag className="w-4 h-4" />
                Priority
              </button>
              
              {showPriorityMenu && (
                <div className="absolute bottom-full mb-2 left-0 card min-w-[150px] shadow-xl">
                  {['urgent', 'high', 'medium', 'low'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => {
                        onBulkChangePriority(priority);
                        setShowPriorityMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors capitalize"
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delete Button */}
          <button
            onClick={onBulkDelete}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2"
            title="Delete tasks"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
