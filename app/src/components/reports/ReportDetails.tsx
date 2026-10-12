'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface DetailRow {
  id: string;
  title: string;
  project: string;
  assignee: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  done: boolean;
  overdue: boolean;
}

const PAGE_SIZE = 25;

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'blue' | 'neutral'> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'blue',
  low: 'neutral',
};

export default function ReportDetails({ rows }: { rows: DetailRow[] }) {
  const t = useTranslations('pages.tools');
  const { locale } = useLocaleSwitch();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [rows]);

  const visible = rows.slice(0, visibleCount);
  const day = (value: string) => format(parseISO(value), 'd MMM yyyy', { locale: dateLocale });
  const priorityLabel = (priority: string) => {
    const keys: Record<string, string> = {
      urgent: 'reports.priorityUrgent',
      high: 'reports.priorityHigh',
      medium: 'reports.priorityMedium',
      low: 'reports.priorityLow',
    };
    return keys[priority] ? t(keys[priority]) : priority;
  };
  const status = (row: DetailRow) =>
    row.done && row.completedAt ? (
      <span className="text-success">{t('reports.doneOn', { date: day(row.completedAt) })}</span>
    ) : row.overdue ? (
      <span className="text-danger">{t('reports.overdue')}</span>
    ) : (
      <span className="text-text-secondary">{t('reports.open')}</span>
    );

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="min-w-0 text-base font-semibold text-text-primary">{t('reports.detailsTitle')}</h2>
        <span className="shrink-0 text-xs tabular-nums text-text-secondary">{t('reports.rowsCount', { count: rows.length })}</span>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-text-secondary">{t('reports.noData')}</p>
      ) : (
        <>
          <table className="hidden w-full text-sm lg:table">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-text-secondary">
                <th scope="col" className="sticky top-14 z-10 bg-surface px-4 py-2.5 font-medium">
                  {t('reports.colTask')}
                </th>
                <th scope="col" className="sticky top-14 z-10 hidden bg-surface px-2 py-2.5 font-medium xl:table-cell">
                  {t('reports.byProject')}
                </th>
                <th scope="col" className="sticky top-14 z-10 hidden bg-surface px-2 py-2.5 font-medium xl:table-cell">
                  {t('reports.colAssignee')}
                </th>
                <th scope="col" className="sticky top-14 z-10 bg-surface px-2 py-2.5 font-medium">
                  {t('reports.colPriority')}
                </th>
                <th scope="col" className="sticky top-14 z-10 bg-surface px-2 py-2.5 font-medium">
                  {t('reports.colDue')}
                </th>
                <th scope="col" className="sticky top-14 z-10 bg-surface px-4 py-2.5 font-medium">
                  {t('reports.colStatus')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-surface-hover">
                  <td className="max-w-0 px-4 py-2.5">
                    <span className="block truncate font-medium text-text-primary" title={row.title}>
                      {row.title}
                    </span>
                    <span className="block truncate text-xs text-text-muted xl:hidden">
                      {[row.project, row.assignee].filter(Boolean).join(' · ')}
                    </span>
                  </td>
                  <td className="hidden max-w-[12rem] truncate px-2 py-2.5 text-text-secondary xl:table-cell">{row.project}</td>
                  <td className="hidden max-w-[10rem] truncate px-2 py-2.5 text-text-secondary xl:table-cell">{row.assignee}</td>
                  <td className="px-2 py-2.5">
                    <Badge size="sm" variant={PRIORITY_VARIANT[row.priority] || 'neutral'}>
                      {priorityLabel(row.priority)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-text-secondary">{row.dueDate ? day(row.dueDate) : '-'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{status(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-border lg:hidden">
            {visible.map((row) => (
              <li key={row.id} className="min-h-14 px-4 py-3">
                <p className="break-words text-sm font-medium text-text-primary">{row.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <Badge size="sm" variant={PRIORITY_VARIANT[row.priority] || 'neutral'}>
                    {priorityLabel(row.priority)}
                  </Badge>
                  {status(row)}
                  {row.project ? <span className="truncate text-text-secondary">{row.project}</span> : null}
                  {row.assignee ? <span className="truncate text-text-secondary">{row.assignee}</span> : null}
                </div>
              </li>
            ))}
          </ul>

          {rows.length > visible.length ? (
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <span className="text-xs text-text-secondary">
                {t('reports.showing', { shown: visible.length, total: rows.length })}
              </span>
              <Button type="button" variant="secondary" size="sm" className="h-11 sm:h-8" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                {t('reports.showMore')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
