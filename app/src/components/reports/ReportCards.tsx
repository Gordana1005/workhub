'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Segmented } from '@/components/tools/Segmented';
import { useSeriesColors } from '@/components/tools/chart';

export interface TrendPoint {
  label: string;
  created: number;
  completed: number;
  hours: number;
}

export type Slice = {
  key: string;
  name: string;
  value: number;
};

export interface BreakdownRow {
  key: string;
  name: string;
  value: number;
  hours?: number;
}

export function Card({
  title,
  action,
  className = '',
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-border bg-surface p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="min-w-0 text-base font-semibold text-text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function NoData({ label }: { label: string }) {
  return <p className="flex h-32 items-center justify-center text-center text-sm text-text-secondary">{label}</p>;
}

/** Placeholder with the same footprint as a chart card while the chart code loads. */
export function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`min-w-0 rounded-2xl border border-border bg-surface p-4 ${className}`}
    >
      <div className="skeleton mb-4 h-5 w-1/3" />
      <div className="skeleton h-[220px] w-full rounded-xl sm:h-[260px]" />
    </div>
  );
}

type BreakdownTab = 'project' | 'person' | 'category';

/** Horizontal bars as plain HTML: they wrap long names, stay readable on phones and double as a table view. */
export function BreakdownCard({
  rows,
  className = '',
}: {
  rows: Record<BreakdownTab, BreakdownRow[]>;
  className?: string;
}) {
  const t = useTranslations('pages.tools');
  const palette = useSeriesColors();
  const [tab, setTab] = useState<BreakdownTab>('project');
  const list = rows[tab].slice(0, 10);
  const max = Math.max(1, ...list.map((row) => row.value));
  const showHours = tab !== 'category';

  return (
    <Card
      title={t('reports.breakdownTitle')}
      className={className}
      action={
        <Segmented
          label={t('reports.breakdownTitle')}
          value={tab}
          onChange={setTab}
          stretchOnPhone
          options={[
            { value: 'project', label: t('reports.byProject') },
            { value: 'person', label: t('reports.byPerson') },
            { value: 'category', label: t('reports.byCategory') },
          ]}
        />
      }
    >
      {list.length > 0 ? (
        <ul className="space-y-3.5">
          {list.map((row) => (
            <li key={row.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 break-words text-text-primary">{row.name}</span>
                <span className="shrink-0 tabular-nums text-text-secondary">
                  <span className="font-semibold text-text-primary">{row.value}</span>
                  {showHours && row.hours ? ` · ${row.hours} ${t('reports.hoursUnit')}` : ''}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hover">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${Math.max((row.value / max) * 100, 2)}%`, backgroundColor: palette[0] }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <NoData label={t('reports.noData')} />
      )}
    </Card>
  );
}
