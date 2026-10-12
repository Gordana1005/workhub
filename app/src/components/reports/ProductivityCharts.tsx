'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslations } from 'next-intl';

interface ProductivityChartsProps {
  tasksData: {
    date: string;
    completed: number;
    created: number;
  }[];
  priorityData: {
    name: string;
    value: number;
  }[];
  categoryData: {
    name: string;
    value: number;
  }[];
  completionRate: number;
}

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1'];

const axisTick = { fontSize: 11, fill: 'var(--text-secondary)' };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3 text-text-primary shadow-md">
        {label ? <p className="mb-1 text-sm font-semibold">{label}</p> : null}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function truncateLabel(value: unknown) {
  const label = String(value ?? '');
  return label.length > 12 ? `${label.slice(0, 12)}…` : label;
}

export default function ProductivityCharts({
  tasksData,
  priorityData,
  categoryData,
  completionRate,
}: ProductivityChartsProps) {
  const t = useTranslations('pages.tools');
  const chartBox = 'h-[220px] w-full max-w-full sm:h-[280px]';

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4 lg:col-span-2">
        <h3 className="mb-3 text-base font-semibold text-text-primary">{t('reports.trendTitle')}</h3>
        <div className={chartBox}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tasksData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                tick={axisTick}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis stroke="var(--text-muted)" tick={axisTick} width={32} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 3 }}
                activeDot={{ r: 5 }}
                name={t('reports.legendCompleted')}
              />
              <Line
                type="monotone"
                dataKey="created"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
                name={t('reports.legendCreated')}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-base font-semibold text-text-primary">{t('reports.byPriority')}</h3>
        <div className={chartBox}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                outerRadius="78%"
                dataKey="value"
                label={false}
              >
                {priorityData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-2 space-y-1.5">
          {priorityData.map((item, index) => (
            <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-text-primary">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 font-semibold text-text-primary">{item.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-base font-semibold text-text-primary">{t('reports.byCategory')}</h3>
        <div className={chartBox}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--text-muted)" tick={axisTick} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={88}
                stroke="var(--text-muted)"
                tick={axisTick}
                tickFormatter={truncateLabel}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} name={t('reports.byCategory')}>
                {categoryData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {categoryData.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {categoryData.map((item, index) => (
              <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-text-primary">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="shrink-0 font-semibold text-text-primary">{item.value}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 lg:col-span-2">
        <h3 className="mb-3 text-base font-semibold text-text-primary">{t('reports.overallRate')}</h3>
        <div className="flex items-center justify-center py-2">
          <div className="relative h-40 w-40 max-w-full sm:h-52 sm:w-52">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="url(#reports-completion)"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40 * (completionRate / 100)} ${2 * Math.PI * 40}`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="reports-completion" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--brand-blue)" />
                  <stop offset="100%" stopColor="var(--brand-green)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-text-primary">{completionRate.toFixed(1)}%</span>
              <span className="mt-1 text-sm text-text-secondary">{t('reports.completedLabel')}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
