'use client';

import { useState, useEffect } from 'react';
import { Link2, X, Search } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
}

interface DependencySelectorProps {
  taskId: string;
  projectId?: string;
  selectedDependencies: string[];
  onChange: (dependencies: string[]) => void;
}

export default function DependencySelector({
  taskId,
  projectId,
  selectedDependencies,
  onChange,
}: DependencySelectorProps) {
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded && projectId) {
      loadAvailableTasks();
    }
  }, [isExpanded, projectId]);

  const loadAvailableTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}`);
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
  };

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
        <label className="flex items-center gap-2 text-sm font-medium">
          <Link2 className="w-4 h-4 text-purple-400" />
          Dependencies
        </label>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          {isExpanded ? 'Collapse' : 'Manage'}
        </button>
      </div>

      {/* Selected Dependencies */}
      {selectedTasks.length > 0 && (
        <div className="space-y-2">
          {selectedTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 bg-surface-light rounded-lg border border-white/10"
            >
              <div className="flex items-center gap-3">
                <Link2 className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{task.status}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeDependency(task.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Dependencies */}
      {isExpanded && (
        <div className="space-y-3 p-4 bg-surface-light rounded-lg border border-white/10">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks to add as dependency..."
              className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none text-sm"
            />
          </div>

          {/* Available Tasks */}
          {loading ? (
            <div className="text-center py-4 text-sm text-gray-400">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-400">
              {searchQuery ? 'No tasks found' : 'No available tasks'}
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredTasks.map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => addDependency(task.id)}
                  className="w-full flex items-center gap-3 p-3 bg-surface rounded-lg border border-white/10 hover:border-purple-500/50 transition-colors text-left"
                >
                  <Link2 className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-gray-400 capitalize">{task.status}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-white/10">
            <p className="text-xs text-gray-400">
              ℹ️ This task will be blocked until all dependencies are completed
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
