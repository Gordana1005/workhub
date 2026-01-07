'use client';

import { useMemo, useRef, useState } from 'react';
import { format, eachMonthOfInterval, eachWeekOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInDays, addDays, isSameDay } from 'date-fns';

export interface Plan {
  start_date: string;
  end_date: string;
  color: string;
}

export interface Milestone {
  id: string;
  plan_id: string;
  name: string;
  description: string;
  target_date: string;
  completion_percentage: number;
  is_completed: boolean;
  completed_at: string | null;
  order_index: number;
  task_count?: number;
}

interface GanttTimelineProps {
  plan: Plan;
  milestones: Milestone[];
  onMilestoneClick?: (milestone: Milestone) => void;
}

export default function GanttTimeline({ plan, milestones, onMilestoneClick }: GanttTimelineProps) {
  const [viewMode, setViewMode] = useState<'weeks' | 'months'>('weeks');
  const scrollRef = useRef<HTMLDivElement>(null);

  const startDate = new Date(plan.start_date);
  const endDate = new Date(plan.end_date);

  // Generate time periods
  const timePeriods = useMemo(() => {
    if (viewMode === 'months') {
      return eachMonthOfInterval({ start: startDate, end: endDate });
    } else {
      return eachWeekOfInterval({ start: startDate, end: endDate });
    }
  }, [startDate, endDate, viewMode]);

  const totalDays = differenceInDays(endDate, startDate);
  const dayWidth = 40; // pixels per day in week view
  const monthWidth = 120; // pixels per month

  const getPositionForDate = (date: Date) => {
    const daysFromStart = differenceInDays(date, startDate);
    if (viewMode === 'weeks') {
      return (daysFromStart / 7) * (dayWidth * 7);
    } else {
      // Approximate for months view
      return (daysFromStart / 30) * monthWidth;
    }
  };

  const todayPosition = getPositionForDate(new Date());

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('weeks')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'weeks'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Weeks
          </button>
          <button
            onClick={() => setViewMode('months')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'months'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Months
          </button>
        </div>

        <div className="text-sm text-slate-400">
          {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
        </div>
      </div>

      {/* Timeline Container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden"
        style={{ maxHeight: '400px' }}
      >
        <div className="relative" style={{ minWidth: `${timePeriods.length * (viewMode === 'weeks' ? dayWidth * 7 : monthWidth)}px` }}>
          {/* Time Header */}
          <div className="flex border-b border-slate-700 mb-4 pb-2">
            {timePeriods.map((period, i) => (
              <div
                key={i}
                className="text-sm text-slate-400 font-medium text-center"
                style={{ 
                  width: viewMode === 'weeks' ? `${dayWidth * 7}px` : `${monthWidth}px`,
                  minWidth: viewMode === 'weeks' ? `${dayWidth * 7}px` : `${monthWidth}px`
                }}
              >
                {viewMode === 'weeks'
                  ? `Week ${i + 1}`
                  : format(period, 'MMM yyyy')}
              </div>
            ))}
          </div>

          {/* Today Marker */}
          {todayPosition >= 0 && todayPosition <= timePeriods.length * (viewMode === 'weeks' ? dayWidth * 7 : monthWidth) && (
            <div
              className="absolute top-8 bottom-0 w-0.5 bg-blue-500 z-10"
              style={{ left: `${todayPosition}px` }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-blue-500 font-medium whitespace-nowrap">
                Today
              </div>
            </div>
          )}

          {/* Milestones */}
          <div className="space-y-3">
            {milestones.map((milestone, index) => {
              const milestoneDate = new Date(milestone.target_date);
              const position = getPositionForDate(milestoneDate);
              const isOverdue = milestoneDate < new Date() && !milestone.is_completed;

              return (
                <div key={milestone.id} className="relative h-12">
                  {/* Background Track */}
                  <div className="absolute inset-0 bg-slate-800 rounded-lg" />

                  {/* Progress Bar */}
                  <div
                    className="absolute inset-0 rounded-lg transition-all"
                    style={{
                      width: `${milestone.completion_percentage}%`,
                      backgroundColor: milestone.is_completed
                        ? '#10b981'
                        : isOverdue
                        ? '#ef4444'
                        : plan.color,
                      opacity: 0.3,
                    }}
                  />

                  {/* Milestone Marker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 cursor-pointer group"
                    style={{ left: `${position}px` }}
                    onClick={() => onMilestoneClick?.(milestone)}
                  >
                    <div
                      className={`w-4 h-4 rotate-45 transition-all group-hover:scale-125 ${
                        milestone.is_completed
                          ? 'bg-green-500'
                          : isOverdue
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        boxShadow: '0 0 0 4px rgba(0, 0, 0, 0.5)',
                      }}
                    />

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                      <div className="text-sm font-medium text-white mb-1">
                        {milestone.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {format(milestoneDate, 'MMM d, yyyy')} • {milestone.completion_percentage}%
                      </div>
                    </div>
                  </div>

                  {/* Milestone Name */}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white font-medium pointer-events-none z-10">
                    {milestone.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid Lines */}
          <div className="absolute inset-0 pointer-events-none">
            {timePeriods.map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-slate-800"
                style={{ left: `${i * (viewMode === 'weeks' ? dayWidth * 7 : monthWidth)}px` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-sm" />
          In Progress
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-sm" />
          Completed
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-sm" />
          Overdue
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-blue-500" />
          Today
        </div>
      </div>
    </div>
  );
}
