'use client';

import { useMemo, useRef, useState } from 'react';
import { format, eachMonthOfInterval, eachWeekOfInterval, differenceInDays } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

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
  const t = useTranslations('pages.plans');
  const locale = useLocale();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const [viewMode, setViewMode] = useState<'weeks' | 'months'>('weeks');
  const scrollRef = useRef<HTMLDivElement>(null);

  const startDate = useMemo(() => new Date(plan.start_date), [plan.start_date]);
  const endDate = useMemo(() => new Date(plan.end_date), [plan.end_date]);

  const timePeriods = useMemo(() => {
    const end = endDate < startDate ? startDate : endDate;
    if (viewMode === 'months') {
      return eachMonthOfInterval({ start: startDate, end });
    }
    return eachWeekOfInterval({ start: startDate, end });
  }, [startDate, endDate, viewMode]);

  const dayWidth = 40;
  const monthWidth = 120;
  const periodWidth = viewMode === 'weeks' ? dayWidth * 7 : monthWidth;
  const timelineWidth = timePeriods.length * periodWidth;

  const getPositionForDate = (date: Date) => {
    const daysFromStart = differenceInDays(date, startDate);
    if (viewMode === 'weeks') {
      return (daysFromStart / 7) * periodWidth;
    }
    return (daysFromStart / 30) * monthWidth;
  };

  const todayPosition = getPositionForDate(new Date());

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'weeks' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('weeks')}
          >
            {t('weeks')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'months' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('months')}
          >
            {t('months')}
          </Button>
        </div>

        <p className="text-sm text-text-secondary">
          {format(startDate, 'MMM d, yyyy', { locale: dateLocale })} – {format(endDate, 'MMM d, yyyy', { locale: dateLocale })}
        </p>
      </div>

      <div
        ref={scrollRef}
        className="w-full min-w-0 overflow-x-auto overscroll-x-contain"
      >
        <div className="relative" style={{ width: `${timelineWidth}px`, minWidth: `${timelineWidth}px` }}>
          <div className="mb-4 flex border-b border-border pb-2">
            {timePeriods.map((period, index) => (
              <div
                key={period.toISOString()}
                className="text-center text-sm font-medium text-text-secondary"
                style={{ width: `${periodWidth}px`, minWidth: `${periodWidth}px` }}
              >
                {viewMode === 'weeks'
                  ? t('week', { number: index + 1 })
                  : format(period, 'MMM yyyy', { locale: dateLocale })}
              </div>
            ))}
          </div>

          {todayPosition >= 0 && todayPosition <= timelineWidth ? (
            <div
              className="absolute bottom-0 top-8 z-10 w-0.5 bg-primary"
              style={{ left: `${todayPosition}px` }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-primary">
                {t('today')}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {milestones.map((milestone) => {
              const milestoneDate = new Date(milestone.target_date);
              const position = getPositionForDate(milestoneDate);
              const isOverdue = milestoneDate < new Date() && !milestone.is_completed;

              return (
                <div key={milestone.id} className="relative h-12">
                  <div className="absolute inset-0 rounded-lg bg-surface-hover" />

                  <div
                    className="absolute inset-y-0 left-0 rounded-lg"
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

                  <div
                    className="group absolute top-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ left: `${position}px` }}
                    onClick={() => onMilestoneClick?.(milestone)}
                  >
                    <div
                      className={`h-4 w-4 rotate-45 ring-2 ring-surface ${
                        milestone.is_completed
                          ? 'bg-green-500'
                          : isOverdue
                          ? 'bg-red-500'
                          : 'bg-primary'
                      }`}
                    />

                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="mb-1 text-sm font-medium text-text-primary">
                        {milestone.name}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {format(milestoneDate, 'MMM d, yyyy', { locale: dateLocale })} · {milestone.completion_percentage}%
                      </div>
                    </div>
                  </div>

                  <div className="pointer-events-none absolute left-3 top-1/2 z-10 max-w-[40%] -translate-y-1/2 truncate text-sm font-medium text-text-primary">
                    {milestone.name}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pointer-events-none absolute inset-0">
            {timePeriods.map((period, index) => (
              <div
                key={`${period.toISOString()}-line`}
                className="absolute bottom-0 top-0 w-px bg-border"
                style={{ left: `${index * periodWidth}px` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-secondary">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-primary" />
          {t('inProgress')}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-green-500" />
          {t('legendCompleted')}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          {t('overdue')}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 bg-primary" />
          {t('today')}
        </div>
      </div>
    </div>
  );
}
