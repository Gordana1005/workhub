'use client';

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
import { ChartTooltip, axisTick, useSeriesColors } from '@/components/tools/chart';
import { Card, NoData, type Slice, type TrendPoint } from './ReportCards';

export type { BreakdownRow, Slice, TrendPoint } from './ReportCards';

// min-w-0 + a fixed height keep the container measurable (never 0 wide/tall), and initialDimension gives
// Recharts a size before its first measurement so it does not log width(-1) warnings.
const chartBox = 'h-[220px] min-h-[220px] w-full min-w-0 max-w-full sm:h-[260px] sm:min-h-[260px]';
const chartInitial = { width: 320, height: 220 };

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
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={chartInitial}>
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
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-text-secondary">
            {[
              { label: t('reports.legendCompleted'), color: palette[0] },
              { label: t('reports.legendCreated'), color: palette[1] },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span className="h-1 w-4 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
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
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={chartInitial}>
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
          <div className="relative mx-auto h-40 w-40 min-w-0" role="img" aria-label={t('reports.byPriority')}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 160, height: 160 }}>
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
              <li key={slice.key} className="flex min-h-8 items-center gap-2 text-sm">
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
