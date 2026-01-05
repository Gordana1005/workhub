'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

export interface TaskFilters {
  status: 'all' | 'completed' | 'active';
  priority: 'all' | 'low' | 'medium' | 'high' | 'urgent';
  category: 'all' | string;
  assignee: 'all' | string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'overdue';
  search: string;
}

interface AdvancedFilterProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  categories?: string[];
  assignees?: { id: string; name: string }[];
}

export default function AdvancedFilter({ 
  filters, 
  onFiltersChange,
  categories = [],
  assignees = []
}: AdvancedFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof TaskFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      priority: 'all',
      category: 'all',
      assignee: 'all',
      dateRange: 'all',
      search: ''
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'search') return value !== '';
    return value !== 'all';
  });

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="Search tasks..."
          className="w-full px-4 py-2.5 pl-10 bg-surface-light rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
        />
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Toggle Advanced Filters */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <Filter className="w-4 h-4" />
        Advanced Filters
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        {hasActiveFilters && (
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
            Active
          </span>
        )}
      </button>

      {/* Advanced Filters Panel */}
      {isExpanded && (
        <div className="card space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filter Tasks</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 bg-surface-light rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
              >
                <option value="all">All Tasks</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => updateFilter('priority', e.target.value)}
                className="w-full px-3 py-2 bg-surface-light rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <select
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
                className="w-full px-3 py-2 bg-surface-light rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
              >
                <option value="all">All Dates</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="w-full px-3 py-2 bg-surface-light rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Assignee Filter */}
            {assignees.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Assigned To</label>
                <select
                  value={filters.assignee}
                  onChange={(e) => updateFilter('assignee', e.target.value)}
                  className="w-full px-3 py-2 bg-surface-light rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
                >
                  <option value="all">All Members</option>
                  {assignees.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
