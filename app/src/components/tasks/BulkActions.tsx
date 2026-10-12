'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('pages.tasks');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const priorityLabel = (priority: string) => {
    if (priority === 'low') return t('priorityLow');
    if (priority === 'medium') return t('priorityMedium');
    if (priority === 'high') return t('priorityHigh');
    if (priority === 'urgent') return t('priorityUrgent');
    return priority;
  };

  if (selectedTasks.length === 0) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 lg:inset-x-auto lg:bottom-8 lg:left-1/2 lg:-translate-x-1/2">
      <div className="card flex flex-wrap items-center gap-3 px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-4 lg:flex-nowrap lg:gap-4 lg:px-6 lg:py-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary" />
          <span className="font-semibold">
            {t('tasksSelected', { count: selectedTasks.length })}
          </span>
        </div>

        <div className="hidden h-6 w-px bg-border lg:block" />

        <div className="flex flex-wrap items-center gap-2">
          {/* Complete Button */}
          <button
            onClick={onBulkComplete}
            className="px-4 py-2 bg-success/10 hover:bg-success/20 text-success rounded-lg transition-colors flex items-center gap-2"
            title={t('markComplete')}
          >
            <CheckSquare className="w-4 h-4" />
            {t('complete')}
          </button>

          {/* Priority Button */}
          {onBulkChangePriority && (
            <div className="relative">
              <button
                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors flex items-center gap-2"
                title={t('changePriority')}
              >
                <Tag className="w-4 h-4" />
                {t('priority')}
              </button>
              
              {showPriorityMenu && (
                <div className="absolute bottom-full mb-2 left-0 card min-w-[150px] shadow-xl text-text-primary">
                  {['urgent', 'high', 'medium', 'low'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => {
                        onBulkChangePriority(priority);
                        setShowPriorityMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-surface-hover transition-colors capitalize"
                    >
                      {priorityLabel(priority)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delete Button */}
          <button
            onClick={onBulkDelete}
            className="px-4 py-2 bg-danger/10 hover:bg-danger/20 text-danger rounded-lg transition-colors flex items-center gap-2"
            title={t('deleteTasks')}
          >
            <Trash2 className="w-4 h-4" />
            {t('delete')}
          </button>

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            className="p-2 text-text-secondary hover:bg-surface-hover rounded-lg transition-colors"
            title={t('clearSelection')}
            aria-label={t('clearSelection')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
