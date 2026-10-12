'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { Download, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import ExportDialog from '@/components/ExportDialog';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/tools/Segmented';
import { useSeriesColors } from '@/components/tools/chart';
import {
  BreakdownCard,
  PriorityCard,
  TimeCard,
  TrendCard,
  type BreakdownRow,
  type TrendPoint,
} from '@/components/reports/ReportCharts';
import ReportDetails, { type DetailRow } from '@/components/reports/ReportDetails';

type Range = '7d' | '30d' | '90d' | 'year' | 'all';

interface TaskRecord {
  id: string;
  title: string;
  priority: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  due_date: string | null;
  category: string | null;
  project_id: string | null;
  assignee_id: string | null;
  [key: string]: unknown;
}

interface TimeRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  duration: number;
  date: string | null;
  created_at: string;
}

interface Member {
  id: string;
  name: string;
}

const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;
const NONE = '__none__';

function rangeBounds(range: Range, earliest: Date) {
  const end = endOfDay(new Date());
  switch (range) {
    case '7d':
      return { start: startOfDay(subDays(end, 6)), end };
    case '30d':
      return { start: startOfDay(subDays(end, 29)), end };
    case '90d':
      return { start: startOfDay(subDays(end, 89)), end };
    case 'year':
      return { start: startOfYear(end), end };
    default:
      return { start: startOfDay(earliest > end ? end : earliest), end };
  }
}

const hoursOf = (seconds: number) => Math.round((seconds / 3600) * 10) / 10;

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export default function ReportsPage() {
  const t = useTranslations('pages.tools');
  const { locale } = useLocaleSwitch();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const { currentWorkspace } = useWorkspaceStore();
  const palette = useSeriesColors();
  const workspaceId = currentWorkspace?.id;

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [entries, setEntries] = useState<TimeRecord[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [range, setRange] = useState<Range>('30d');
  const [projectFilter, setProjectFilter] = useState('all');
  const [personFilter, setPersonFilter] = useState('all');

  const loadReportData = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setFailed(false);
    try {
      const [reportRes, teamRes] = await Promise.all([
        fetch(`/api/reports?workspace_id=${workspaceId}`),
        fetch(`/api/team?workspace_id=${workspaceId}`),
      ]);
      const report = await reportRes.json();
      if (!reportRes.ok) throw new Error(report.error || 'report failed');
      const team = teamRes.ok ? await teamRes.json() : { members: [] };

      setTasks(report.tasks || []);
      setEntries(report.timeEntries || []);
      setProjects((report.projects || []).map((project: any) => ({ id: project.id, name: project.name })));
      setMembers(
        (team.members || []).map((member: any) => ({
          id: member.user_id,
          name: member.profiles?.username || member.profiles?.email || '',
        }))
      );
    } catch (error) {
      console.error('Failed to load report data:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    setProjectFilter('all');
    setPersonFilter('all');
    loadReportData();
  }, [loadReportData]);

  const projectName = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const memberName = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members]);

  // Everything below is derived from the filters, so changing a filter never refetches.
  const report = useMemo(() => {
    const entryDate = (entry: TimeRecord) => parseISO(entry.date || entry.created_at);

    const earliestTask = tasks.reduce<Date | null>((min, task) => {
      const date = parseISO(task.created_at);
      return !min || date < min ? date : min;
    }, null);
    const earliestEntry = entries.reduce<Date | null>((min, entry) => {
      const date = entryDate(entry);
      return !min || date < min ? date : min;
    }, null);
    const earliest = [earliestTask, earliestEntry].filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime())[0] || new Date();

    const { start, end } = rangeBounds(range, earliest);
    const inside = (date: Date, from = start, to = end) => isWithinInterval(date, { start: from, end: to });

    const scopeTasks = tasks.filter(
      (task) =>
        (projectFilter === 'all' || task.project_id === projectFilter) &&
        (personFilter === 'all' || task.assignee_id === personFilter)
    );
    const scopeEntries = entries.filter(
      (entry) =>
        (projectFilter === 'all' || entry.project_id === projectFilter) &&
        (personFilter === 'all' || entry.user_id === personFilter)
    );

    const createdIn = (from: Date, to: Date) => scopeTasks.filter((task) => inside(parseISO(task.created_at), from, to));
    const completedIn = (from: Date, to: Date) =>
      scopeTasks.filter((task) => task.is_completed && task.completed_at && inside(parseISO(task.completed_at), from, to));
    const secondsIn = (from: Date, to: Date) =>
      scopeEntries.filter((entry) => inside(entryDate(entry), from, to)).reduce((sum, entry) => sum + (entry.duration || 0), 0);

    const created = createdIn(start, end);
    const completed = completedIn(start, end);
    const seconds = secondsIn(start, end);

    const now = new Date();
    const open = scopeTasks.filter((task) => !task.is_completed);
    const overdue = open.filter((task) => task.due_date && endOfDay(parseISO(task.due_date)) < now);

    // Previous period of equal length, for the "vs previous" hints.
    let previous: { created: number; completed: number; hours: number } | null = null;
    if (range !== 'all') {
      const length = differenceInCalendarDays(end, start) + 1;
      const prevEnd = endOfDay(subDays(start, 1));
      const prevStart = startOfDay(subDays(start, length));
      previous = {
        created: createdIn(prevStart, prevEnd).length,
        completed: completedIn(prevStart, prevEnd).length,
        hours: hoursOf(secondsIn(prevStart, prevEnd)),
      };
    }

    // Trend buckets: days up to a month, weeks up to ~4 months, months beyond.
    const spanDays = differenceInCalendarDays(end, start) + 1;
    const unit: 'day' | 'week' | 'month' = spanDays <= 31 ? 'day' : spanDays <= 130 ? 'week' : 'month';
    const buckets: { from: Date; to: Date; label: string }[] = [];
    if (unit === 'day') {
      for (let day = startOfDay(start); day <= end; day = addDays(day, 1)) {
        buckets.push({ from: day, to: endOfDay(day), label: format(day, 'd MMM', { locale: dateLocale }) });
      }
    } else if (unit === 'week') {
      for (let week = startOfWeek(start, { weekStartsOn: 1 }); week <= end; week = addWeeks(week, 1)) {
        buckets.push({
          from: week < start ? start : week,
          to: endOfDay(addDays(week, 6)) > end ? end : endOfDay(addDays(week, 6)),
          label: format(week, 'd MMM', { locale: dateLocale }),
        });
      }
    } else {
      for (let month = startOfMonth(start); month <= end; month = addMonths(month, 1)) {
        const monthEnd = endOfDay(subDays(addMonths(month, 1), 1));
        buckets.push({
          from: month < start ? start : month,
          to: monthEnd > end ? end : monthEnd,
          label: format(month, 'MMM yy', { locale: dateLocale }),
        });
      }
    }
    const trend: TrendPoint[] = buckets.map((bucket) => ({
      label: bucket.label,
      created: createdIn(bucket.from, bucket.to).length,
      completed: completedIn(bucket.from, bucket.to).length,
      hours: hoursOf(secondsIn(bucket.from, bucket.to)),
    }));

    // Distributions use the tasks created in the range.
    const priorityCounts = new Map<string, number>();
    const byProject = new Map<string, { value: number; seconds: number }>();
    const byPerson = new Map<string, { value: number; seconds: number }>();
    const byCategory = new Map<string, number>();
    const bump = (map: Map<string, { value: number; seconds: number }>, key: string, value: number, secs: number) => {
      const row = map.get(key) || { value: 0, seconds: 0 };
      row.value += value;
      row.seconds += secs;
      map.set(key, row);
    };
    created.forEach((task) => {
      priorityCounts.set(task.priority, (priorityCounts.get(task.priority) || 0) + 1);
      bump(byProject, task.project_id || NONE, 1, 0);
      bump(byPerson, task.assignee_id || NONE, 1, 0);
      if (task.category) byCategory.set(task.category, (byCategory.get(task.category) || 0) + 1);
    });
    scopeEntries
      .filter((entry) => inside(entryDate(entry), start, end))
      .forEach((entry) => {
        bump(byProject, entry.project_id || NONE, 0, entry.duration || 0);
        bump(byPerson, entry.user_id || NONE, 0, entry.duration || 0);
      });

    const toRows = (map: Map<string, { value: number; seconds: number }>, nameOf: (key: string) => string): BreakdownRow[] =>
      Array.from(map.entries())
        .map(([key, row]) => ({ key, name: nameOf(key), value: row.value, hours: hoursOf(row.seconds) }))
        .filter((row) => row.value > 0 || (row.hours || 0) > 0)
        .sort((a, b) => b.value - a.value || (b.hours || 0) - (a.hours || 0));

    const breakdown = {
      project: toRows(byProject, (key) => (key === NONE ? t('reports.noProject') : projectName.get(key) || t('reports.noProject'))),
      person: toRows(byPerson, (key) => (key === NONE ? t('reports.unassigned') : memberName.get(key) || t('reports.unassigned'))),
      category: Array.from(byCategory.entries())
        .map(([name, value]) => ({ key: name, name, value }))
        .sort((a, b) => b.value - a.value),
    };

    const detailTasks = scopeTasks
      .filter(
        (task) =>
          inside(parseISO(task.created_at), start, end) ||
          (task.completed_at ? inside(parseISO(task.completed_at), start, end) : false)
      )
      .sort((a, b) => {
        const stamp = (task: TaskRecord) => (task.completed_at || task.created_at);
        return stamp(b).localeCompare(stamp(a));
      });

    return {
      created: created.length,
      completed: completed.length,
      hours: hoursOf(seconds),
      open: open.length,
      overdue: overdue.length,
      rate: created.length > 0 ? Math.round((created.filter((task) => task.is_completed).length / created.length) * 100) : 0,
      previous,
      trend,
      priorities: PRIORITIES.map((key) => ({ key, name: t(`reports.priority${key[0].toUpperCase()}${key.slice(1)}`), value: priorityCounts.get(key) || 0 })),
      breakdown,
      detailTasks,
      now,
    };
  }, [tasks, entries, range, projectFilter, personFilter, projectName, memberName, dateLocale, t]);

  const priorityColors: Record<string, string> = {
    urgent: palette[7],
    high: palette[1],
    medium: palette[3],
    low: palette[0],
  };

  const detailRows: DetailRow[] = useMemo(
    () =>
      report.detailTasks.map((task) => ({
        id: task.id,
        title: task.title,
        project: task.project_id ? projectName.get(task.project_id) || '' : '',
        assignee: task.assignee_id ? memberName.get(task.assignee_id) || '' : '',
        priority: task.priority,
        dueDate: task.due_date,
        completedAt: task.completed_at,
        createdAt: task.created_at,
        done: task.is_completed,
        overdue: !task.is_completed && !!task.due_date && endOfDay(parseISO(task.due_date)) < report.now,
      })),
    [report.detailTasks, report.now, projectName, memberName]
  );

  // The export helpers expect joined project / assignee objects; the raw rows only carry ids.
  const exportRows = useMemo(
    () =>
      report.detailTasks.map((task) => ({
        ...task,
        projects: task.project_id ? { name: projectName.get(task.project_id) || '' } : null,
        assigned_to_user: task.assignee_id ? { username: memberName.get(task.assignee_id) || '' } : null,
      })),
    [report.detailTasks, projectName, memberName]
  );

  const filtersActive = range !== '30d' || projectFilter !== 'all' || personFilter !== 'all';
  const resetFilters = () => {
    setRange('30d');
    setProjectFilter('all');
    setPersonFilter('all');
  };

  const rangeOptions: { value: Range; label: string }[] = [
    { value: '7d', label: t('reports.range7') },
    { value: '30d', label: t('reports.range30') },
    { value: '90d', label: t('reports.range90') },
    { value: 'year', label: t('reports.rangeYear') },
    { value: 'all', label: t('reports.rangeAll') },
  ];

  const selectClass =
    'h-9 min-w-0 flex-1 rounded-lg border border-border bg-secondary px-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-[13rem] sm:flex-none';

  if (!workspaceId) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('reports.title')} description={t('reports.subtitle')} />
        <EmptyState title={t('webhooks.noWorkspace')} />
      </div>
    );
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-text-secondary">{t('reports.loading')}</div>;
  }

  if (failed) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('reports.title')} description={t('reports.subtitle')} />
        <EmptyState
          title={t('reports.loadFailed')}
          action={<Button onClick={loadReportData}>{t('reports.retry')}</Button>}
        />
      </div>
    );
  }

  const delta = (current: number, previous: number | undefined) => {
    if (previous === undefined) return null;
    const change = percentChange(current, previous);
    if (change === null) return t('reports.newVsPrevious');
    if (change === 0) return t('reports.sameVsPrevious');
    return t('reports.changeVsPrevious', { change: `${change > 0 ? '+' : ''}${change}%` });
  };

  const kpis = [
    { label: t('reports.created'), value: String(report.created), hint: delta(report.created, report.previous?.created) },
    { label: t('reports.completed'), value: String(report.completed), hint: delta(report.completed, report.previous?.completed) },
    { label: t('reports.hoursLogged'), value: `${report.hours} ${t('reports.hoursUnit')}`, hint: delta(report.hours, report.previous?.hours) },
    { label: t('reports.completionRate'), value: `${report.rate}%`, hint: null },
    { label: t('reports.openNow'), value: String(report.open), hint: null },
    { label: t('reports.overdue'), value: String(report.overdue), hint: null, danger: report.overdue > 0 },
  ];

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title={t('reports.title')}
        description={t('reports.subtitle')}
        action={
          <Button onClick={() => setShowExport(true)} className="gap-2" disabled={report.detailTasks.length === 0}>
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('reports.exportData')}</span>
            <span className="sr-only sm:hidden">{t('reports.exportData')}</span>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          className="hidden md:inline-flex"
          label={t('reports.range')}
          value={range}
          onChange={setRange}
          options={rangeOptions}
        />
        <select
          aria-label={t('reports.range')}
          value={range}
          onChange={(event) => setRange(event.target.value as Range)}
          className={`${selectClass} md:hidden`}
        >
          {rangeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label={t('reports.byProject')}
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className={selectClass}
        >
          <option value="all">{t('reports.allProjects')}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t('reports.byPerson')}
          value={personFilter}
          onChange={(event) => setPersonFilter(event.target.value)}
          className={selectClass}
        >
          <option value="all">{t('reports.allPeople')}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        {filtersActive ? (
          <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t('reports.resetFilters')}
          </Button>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((item) => (
          <div key={item.label} className="min-w-0 bg-surface px-4 py-3">
            <dt className="truncate text-xs font-medium text-text-secondary">{item.label}</dt>
            <dd
              className={`mt-1 truncate text-xl font-semibold tabular-nums ${
                item.danger ? 'text-danger' : 'text-text-primary'
              }`}
            >
              {item.value}
            </dd>
            <p className="mt-0.5 h-4 truncate text-xs text-text-muted">{item.hint}</p>
          </div>
        ))}
      </dl>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        <TrendCard data={report.trend} className="xl:col-span-2" />
        <PriorityCard slices={report.priorities} colors={priorityColors} />
        <TimeCard data={report.trend} />
        <BreakdownCard rows={report.breakdown} className="xl:col-span-2" />
      </div>

      <ReportDetails rows={detailRows} />

      <ExportDialog
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={exportRows}
        dataType="tasks"
        defaultFilename="trackwork-report"
      />
    </div>
  );
}
