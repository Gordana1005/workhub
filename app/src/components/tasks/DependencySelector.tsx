'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link2, X, Search, Info } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
}

interface DependencySelectorProps {
  taskId: string;
  projectId?: string;
  workspaceId?: string;
  selectedDependencies: string[];
  onChange: (dependencies: string[]) => void;
}

export default function DependencySelector({
  taskId,
  projectId,
  workspaceId,
  selectedDependencies,
  onChange,
}: DependencySelectorProps) {
  const t = useTranslations('pages.tasks');
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);

  const statusLabel = (status: string) => {
    if (status === 'To Do') return t('statusToDo');
    if (status === 'In Progress') return t('statusInProgress');
    if (status === 'Review') return t('statusReview');
    if (status === 'Done') return t('statusDone');
    return status;
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAvailableTasks = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      let url = `/api/tasks?workspace_id=${workspaceId}`;
      if (projectId) {
        url += `&project_id=${projectId}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Filter out current task and already selected dependencies
        setAvailableTasks(
          data.filter((t: Task) => t.id !== taskId)
        );
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId, taskId]);

  useEffect(() => {
    // Load up front so already-selected dependencies are listed by title
    if (workspaceId) {
      loadAvailableTasks();
    }
  }, [workspaceId, loadAvailableTasks]);

  const selectedTasks = availableTasks.filter(t =>
    selectedDependencies.includes(t.id)
  );

  const filteredTasks = availableTasks.filter(
    t =>
      !selectedDependencies.includes(t.id) &&
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addDependency = (taskId: string) => {
    onChange([...selectedDependencies, taskId]);
    setSearchQuery('');
  };

  const removeDependency = (taskId: string) => {
    onChange(selectedDependencies.filter(id => id !== taskId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Link2 className="w-4 h-4 text-primary" />
          {t('dependencies')}
        </label>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-primary hover:text-primary/80"
        >
          {isExpanded ? t('collapse') : t('manage')}
        </button>
      </div>

      {/* Selected Dependencies */}
      {selectedTasks.length > 0 && (
        <div className="space-y-2">
          {selectedTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-2 p-3 bg-tertiary rounded-lg border border-border"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Link2 className="w-4 h-4 shrink-0 text-text-secondary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary break-words">{task.title}</p>
                  <p className="text-xs text-text-secondary capitalize">{statusLabel(task.status)}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label={t('delete')}
                onClick={() => removeDependency(task.id)}
                className="shrink-0 p-2 hover:bg-surface-hover rounded transition-colors"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Dependencies */}
      {isExpanded && (
        <div className="space-y-3 p-4 bg-tertiary rounded-lg border border-border">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchDependencies')}
              className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none text-sm"
            />
          </div>

          {/* Available Tasks */}
          {loading ? (
            <div className="text-center py-4 text-sm text-text-secondary">{t('loadingTasks')}</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-4 text-sm text-text-secondary">
              {searchQuery ? t('noTasksFound') : t('noAvailableTasks')}
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredTasks.map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => addDependency(task.id)}
                  className="w-full flex items-center gap-3 p-3 bg-surface rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
                >
                  <Link2 className="w-4 h-4 shrink-0 text-text-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
                    <p className="text-xs text-text-secondary capitalize">{statusLabel(task.status)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-border">
            <p className="flex items-start gap-1.5 text-xs text-text-secondary">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{t('dependencyHint')}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
