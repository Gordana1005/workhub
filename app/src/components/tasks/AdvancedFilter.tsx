'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('pages.tasks');
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
          placeholder={t('searchTasks')}
          className="w-full px-4 py-2.5 pl-10 bg-secondary rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none"
        />
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            type="button" aria-label={t('clearAll')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-text-secondary hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Toggle Advanced Filters */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <Filter className="w-4 h-4" />
        {t('advancedFilters')}
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        {hasActiveFilters && (
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
            {t('filtersActive')}
          </span>
        )}
      </button>

      {/* Advanced Filters Panel */}
      {isExpanded && (
        <div className="card space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t('filterTasks')}</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:text-primary/80"
              >
                {t('clearAll')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('status')}</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 bg-secondary rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none"
              >
                <option value="all">{t('allTasks')}</option>
                <option value="active">{t('active')}</option>
                <option value="completed">{t('completed')}</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('priority')}</label>
              <select
                value={filters.priority}
                onChange={(e) => updateFilter('priority', e.target.value)}
                className="w-full px-3 py-2 bg-secondary rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none"
              >
                <option value="all">{t('allPriorities')}</option>
                <option value="urgent">{t('priorityUrgent')}</option>
                <option value="high">{t('priorityHigh')}</option>
                <option value="medium">{t('priorityMedium')}</option>
                <option value="low">{t('priorityLow')}</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('dueDate')}</label>
              <select
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
                className="w-full px-3 py-2 bg-secondary rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none"
              >
                <option value="all">{t('allDates')}</option>
                <option value="overdue">{t('overdue')}</option>
                <option value="today">{t('dueToday')}</option>
                <option value="week">{t('thisWeek')}</option>
                <option value="month">{t('thisMonth')}</option>
              </select>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('category')}</label>
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="w-full px-3 py-2 bg-secondary rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="all">{t('allCategories')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Assignee Filter */}
            {assignees.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('assignedTo')}</label>
                <select
                  value={filters.assignee}
                  onChange={(e) => updateFilter('assignee', e.target.value)}
                  className="w-full px-3 py-2 bg-secondary rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="all">{t('allMembers')}</option>
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
