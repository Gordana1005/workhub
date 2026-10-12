'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { isMilestoneOverdue, parseDay } from './planUtils';

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
  selectedId?: string | null;
  onMilestoneClick?: (milestone: Milestone) => void;
}

const LABEL_W = 220;
const ROW_H = 52;
const HEADER_H = 40;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary';

/**
 * Roadmap timeline. The card never grows wider than its container: the label column is sticky and
 * only the date area scrolls horizontally. Short plans are stretched to fill the available width,
 * long plans scroll.
 */
export default function GanttTimeline({ plan, milestones, selectedId, onMilestoneClick }: GanttTimelineProps) {
  const t = useTranslations('pages.plans');
  const locale = useLocale();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const [viewMode, setViewMode] = useState<'weeks' | 'months'>('weeks');
  const [viewport, setViewport] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didScroll = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setViewport(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => {
    const planStart = parseDay(plan.start_date);
    const planEnd = parseDay(plan.end_date);
    const dates = milestones.map((milestone) => parseDay(milestone.target_date));
    const all = [planStart, planEnd, ...dates].filter((date) => !Number.isNaN(date.getTime()));
    const min = new Date(Math.min(...all.map((date) => date.getTime())));
    const max = new Date(Math.max(...all.map((date) => date.getTime())));

    const rangeStart = viewMode === 'weeks' ? startOfWeek(min, { weekStartsOn: 1 }) : startOfMonth(min);
    const rangeEnd = viewMode === 'weeks' ? endOfWeek(max, { weekStartsOn: 1 }) : endOfMonth(max);
    const totalDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1;

    const basePx = viewMode === 'weeks' ? 16 : 4.5;
    const available = Math.max(viewport - LABEL_W, 0);
    const pxPerDay = Math.max(basePx, available / totalDays);
    const width = Math.floor(totalDays * pxPerDay);

    const starts =
      viewMode === 'weeks'
        ? eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 })
        : eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
    const periods = starts.map((start, index) => {
      const left = differenceInCalendarDays(start, rangeStart) * pxPerDay;
      const next = starts[index + 1];
      const right = next ? differenceInCalendarDays(next, rangeStart) * pxPerDay : width;
      return { start, left, width: right - left };
    });

    return { planStart, planEnd, rangeStart, rangeEnd, pxPerDay, width, periods };
  }, [plan.start_date, plan.end_date, milestones, viewMode, viewport]);

  const { planStart, planEnd, rangeStart, rangeEnd, pxPerDay, width, periods } = layout;
  const dayX = (date: Date) => differenceInCalendarDays(date, rangeStart) * pxPerDay;

  const now = new Date();
  const todayVisible = now >= rangeStart && now <= rangeEnd;
  const todayX = dayX(now) + pxPerDay / 2;

  // On first measurement, bring "today" into view when the timeline overflows.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || didScroll.current || viewport === 0) return;
    didScroll.current = true;
    if (todayVisible && width > viewport - LABEL_W) {
      el.scrollLeft = Math.max(0, todayX - (viewport - LABEL_W) / 3);
    }
  }, [viewport, todayVisible, todayX, width]);

  const scrollToToday = () => {
    const el = scrollRef.current;
    if (!el || !todayVisible) return;
    el.scrollTo({ left: Math.max(0, todayX - (viewport - LABEL_W) / 2), behavior: 'smooth' });
  };

  const segment = (mode: 'weeks' | 'months', label: string) => (
    <button
      type="button"
      aria-pressed={viewMode === mode}
      onClick={() => setViewMode(mode)}
      className={`h-8 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        viewMode === mode
          ? 'bg-surface text-text-primary shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );

  const toneFor = (milestone: Milestone) => {
    if (milestone.is_completed) return 'var(--brand-green)';
    if (isMilestoneOverdue(milestone.target_date, milestone.is_completed)) return 'var(--brand-red)';
    return plan.color || 'var(--brand-blue)';
  };

  const planBandLeft = dayX(planStart);
  const planBandWidth = (differenceInCalendarDays(planEnd, planStart) + 1) * pxPerDay;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-text-primary">{t('timeline')}</h2>
          <div className="inline-flex gap-0.5 rounded-lg bg-surface-hover p-0.5" role="group" aria-label={t('timeline')}>
            {segment('weeks', t('weeks'))}
            {segment('months', t('months'))}
          </div>
          {todayVisible ? (
            <button
              type="button"
              onClick={scrollToToday}
              className="h-8 rounded-lg px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('today')}
            </button>
          ) : null}
        </div>

        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 rounded-[2px]" style={{ backgroundColor: plan.color || 'var(--brand-blue)' }} aria-hidden />
            {t('inProgress')}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-success" aria-hidden />
            {t('legendCompleted')}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-danger" aria-hidden />
            {t('overdue')}
          </li>
        </ul>
      </div>

      <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain">
        <div className="relative" style={{ width: LABEL_W + width, minWidth: '100%' }}>
          {/* Header */}
          <div className="flex border-b border-border" style={{ height: HEADER_H }}>
            <div
              className="sticky left-0 z-20 shrink-0 border-r border-border bg-surface px-4 text-xs font-medium uppercase tracking-wide text-text-muted"
              style={{ width: LABEL_W, lineHeight: `${HEADER_H}px` }}
            >
              {t('milestones')}
            </div>
            <div className="relative shrink-0" style={{ width }}>
              {periods.map((period) => (
                <div
                  key={period.start.toISOString()}
                  className="absolute inset-y-0 border-l border-border pl-2 text-xs font-medium text-text-secondary"
                  style={{ left: period.left, width: period.width, lineHeight: `${HEADER_H}px` }}
                >
                  <span className="block truncate">
                    {viewMode === 'weeks'
                      ? format(period.start, 'MMM d', { locale: dateLocale })
                      : format(period.start, 'MMM yyyy', { locale: dateLocale })}
                  </span>
                </div>
              ))}
              {todayVisible ? (
                <span
                  className="absolute top-1 z-10 -translate-x-1/2 rounded-full bg-primary px-2 text-[10px] font-semibold leading-4 text-white"
                  style={{ left: todayX }}
                >
                  {t('today')}
                </span>
              ) : null}
            </div>
          </div>

          {/* Body */}
          <div className="relative">
            {/* Grid, plan span and today line live in the date area only */}
            <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: LABEL_W }} aria-hidden>
              <div
                className="absolute inset-y-0"
                style={{
                  left: planBandLeft,
                  width: planBandWidth,
                  backgroundColor: `color-mix(in srgb, ${plan.color || 'var(--brand-blue)'} 6%, transparent)`,
                }}
              />
              {periods.map((period) => (
                <div
                  key={`${period.start.toISOString()}-line`}
                  className="absolute inset-y-0 w-px bg-border"
                  style={{ left: period.left }}
                />
              ))}
              {todayVisible ? (
                <div className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-primary" style={{ left: todayX }} />
              ) : null}
            </div>

            {milestones.map((milestone) => {
              const target = parseDay(milestone.target_date);
              const tone = toneFor(milestone);
              const selected = selectedId === milestone.id;
              const pct = milestone.is_completed ? 100 : Math.max(0, Math.min(100, milestone.completion_percentage));
              const overdue = isMilestoneOverdue(milestone.target_date, milestone.is_completed);
              const barLeft = Math.min(dayX(planStart), dayX(target));
              const barRight = dayX(target) + pxPerDay;
              const barWidth = Math.max(barRight - barLeft, pxPerDay);
              const markerX = dayX(target) + pxPerDay / 2;
              const summary = `${milestone.name} · ${format(target, 'MMM d, yyyy', { locale: dateLocale })} · ${pct}%`;

              return (
                <div
                  key={milestone.id}
                  className={`group relative flex border-b border-border last:border-b-0 ${
                    selected ? 'bg-primary/5' : 'hover:bg-surface-hover/60'
                  }`}
                  style={{ height: ROW_H }}
                >
                  <button
                    type="button"
                    onClick={() => onMilestoneClick?.(milestone)}
                    aria-pressed={selected}
                    className={`sticky left-0 z-10 flex shrink-0 items-center gap-3 border-r border-border px-4 text-left transition-colors ${focusRing} ${
                      selected
                        ? 'bg-[color-mix(in_srgb,var(--brand-blue)_8%,var(--surface))]'
                        : 'bg-surface group-hover:bg-surface-hover'
                    }`}
                    style={{ width: LABEL_W }}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-white"
                      style={{
                        borderColor: tone,
                        backgroundColor: milestone.is_completed ? tone : 'transparent',
                      }}
                      aria-hidden
                    >
                      {milestone.is_completed ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-primary">{milestone.name}</span>
                      <span className={`block truncate text-xs ${overdue ? 'text-danger' : 'text-text-secondary'}`}>
                        {format(target, 'MMM d', { locale: dateLocale })} · {pct}%
                      </span>
                    </span>
                  </button>

                  <div className="relative shrink-0" style={{ width }}>
                    <button
                      type="button"
                      title={summary}
                      aria-label={summary}
                      onClick={() => onMilestoneClick?.(milestone)}
                      className={`absolute top-1/2 h-6 -translate-y-1/2 rounded-md ${focusRing}`}
                      style={{ left: barLeft, width: barWidth }}
                    >
                      <span
                        className="absolute inset-0 rounded-md"
                        style={{ backgroundColor: `color-mix(in srgb, ${tone} 20%, transparent)` }}
                      />
                      <span
                        className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: `color-mix(in srgb, ${tone} 55%, transparent)`,
                        }}
                      />
                    </button>
                    <span
                      className="pointer-events-none absolute top-1/2 z-[5] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] ring-2 ring-surface"
                      style={{ left: markerX, backgroundColor: tone }}
                      aria-hidden
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="sr-only">
        {format(planStart, 'MMM d, yyyy', { locale: dateLocale })} – {format(planEnd, 'MMM d, yyyy', { locale: dateLocale })}
      </p>
    </div>
  );
}
