'use client';

import { useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { Segmented } from '@/components/tools/Segmented';
import { ChartTooltip, axisTick, useSeriesColors } from '@/components/tools/chart';

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

const chartBox = 'h-[220px] w-full max-w-full sm:h-[260px]';

function Card({
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
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function NoData({ label }: { label: string }) {
  return <p className="flex h-32 items-center justify-center text-sm text-text-secondary">{label}</p>;
}

export function TrendCard({ data, className = '' }: { data: TrendPoint[]; className?: string }) {
  const t = useTranslations('pages.tools');
  const palette = useSeriesColors();
  const hasData = data.some((point) => point.created > 0 || point.completed > 0);
  const dots = data.length <= 31;

  return (
    <Card title={t('reports.trendTitle')} className={className}>
      {hasData ? (
        <>
          <div className={chartBox} role="img" aria-label={t('reports.trendTitle')}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--border)" tick={axisTick} interval="preserveStartEnd" minTickGap={24} />
                <YAxis stroke="var(--border)" tick={axisTick} width={40} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name={t('reports.legendCompleted')}
                  stroke={palette[0]}
                  strokeWidth={2}
                  dot={dots ? { r: 3, fill: palette[0], strokeWidth: 0 } : false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="created"
                  name={t('reports.legendCreated')}
                  stroke={palette[1]}
                  strokeWidth={2}
                  dot={dots ? { r: 3, fill: palette[1], strokeWidth: 0 } : false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
            {[
              { label: t('reports.legendCompleted'), color: palette[0] },
              { label: t('reports.legendCreated'), color: palette[1] },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <NoData label={t('reports.noData')} />
      )}
    </Card>
  );
}

export function TimeCard({ data, className = '' }: { data: TrendPoint[]; className?: string }) {
  const t = useTranslations('pages.tools');
  const palette = useSeriesColors();
  const hasData = data.some((point) => point.hours > 0);

  return (
    <Card title={t('reports.timeTitle')} className={className}>
      {hasData ? (
        <div className={chartBox} role="img" aria-label={t('reports.timeTitle')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--border)" tick={axisTick} interval="preserveStartEnd" minTickGap={24} />
              <YAxis stroke="var(--border)" tick={axisTick} width={40} />
              <Tooltip
                cursor={{ fill: 'var(--surface-hover)' }}
                content={<ChartTooltip formatValue={(value) => `${value} ${t('reports.hoursUnit')}`} />}
              />
              <Bar
                dataKey="hours"
                name={t('reports.timeTitle')}
                fill={palette[0]}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <NoData label={t('reports.noTime')} />
      )}
    </Card>
  );
}

export function PriorityCard({
  slices,
  colors,
  className = '',
}: {
  slices: Slice[];
  colors: Record<string, string>;
  className?: string;
}) {
  const t = useTranslations('pages.tools');
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <Card title={t('reports.byPriority')} className={className}>
      {total > 0 ? (
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[10rem_minmax(0,1fr)]">
          <div className="relative mx-auto h-40 w-40" role="img" aria-label={t('reports.byPriority')}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.key} fill={colors[slice.key]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums text-text-primary">{total}</span>
              <span className="text-xs text-text-secondary">{t('reports.tasksUnit')}</span>
            </div>
          </div>
          <ul className="min-w-0 space-y-2">
            {slices.map((slice) => (
              <li key={slice.key} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[slice.key] }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-text-primary">{slice.name}</span>
                <span className="shrink-0 tabular-nums text-text-secondary">{Math.round((slice.value / total) * 100)}%</span>
                <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-text-primary">{slice.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <NoData label={t('reports.noData')} />
      )}
    </Card>
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
          options={[
            { value: 'project', label: t('reports.byProject') },
            { value: 'person', label: t('reports.byPerson') },
            { value: 'category', label: t('reports.byCategory') },
          ]}
        />
      }
    >
      {list.length > 0 ? (
        <ul className="space-y-3">
          {list.map((row) => (
            <li key={row.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-text-primary">{row.name}</span>
                <span className="shrink-0 tabular-nums text-text-secondary">
                  <span className="font-semibold text-text-primary">{row.value}</span>
                  {showHours && row.hours ? ` · ${row.hours} ${t('reports.hoursUnit')}` : ''}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-hover">
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
