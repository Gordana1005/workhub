'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import ProductivityCharts from '@/components/reports/ProductivityCharts';
import ExportDialog from '@/components/ExportDialog';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';

export default function ReportsPage() {
  const t = useTranslations('pages.tools');
  const { locale } = useLocaleSwitch();
  const { currentWorkspace } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    activeTasks: 0,
    totalTimeLogged: 0,
    completionRate: 0,
  });
  const [rawTasks, setRawTasks] = useState<any[]>([]);
  const [tasksData, setTasksData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  const loadReportData = useCallback(async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/reports?workspace_id=${currentWorkspace.id}`);
      const data = await res.json();

      if (data.stats) {
        setStats({
          totalTasks: data.stats.totalTasks || 0,
          completedTasks: data.stats.completedTasks || 0,
          activeTasks: data.stats.activeTasks || 0,
          totalTimeLogged: data.stats.totalTimeLogged || 0,
          completionRate: data.stats.completionRate || 0,
        });
      }

      if (data.tasks) {
        const tasks = data.tasks;
        setRawTasks(tasks);

        const priorityCounts = tasks.reduce((acc: any, task: any) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        }, {});

        setPriorityData([
          { name: t('reports.priorityUrgent'), value: priorityCounts.urgent || 0 },
          { name: t('reports.priorityHigh'), value: priorityCounts.high || 0 },
          { name: t('reports.priorityMedium'), value: priorityCounts.medium || 0 },
          { name: t('reports.priorityLow'), value: priorityCounts.low || 0 },
        ]);

        const categoryCounts = tasks.reduce((acc: any, task: any) => {
          if (task.category) {
            acc[task.category] = (acc[task.category] || 0) + 1;
          }
          return acc;
        }, {});

        setCategoryData(
          Object.entries(categoryCounts).map(([name, value]) => ({
            name,
            value,
          }))
        );

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const trendData = last7Days.map(date => {
          const completed = tasks.filter(
            (task: any) => task.completed_at && task.completed_at.startsWith(date)
          ).length;
          const created = tasks.filter(
            (task: any) => task.created_at && task.created_at.startsWith(date)
          ).length;

          return {
            date: new Date(date).toLocaleDateString(locale === 'mk' ? 'mk-MK' : 'en-US', { month: 'short', day: 'numeric' }),
            completed,
            created,
          };
        });

        setTasksData(trendData);
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, locale, t]);

  useEffect(() => {
    if (currentWorkspace) {
      loadReportData();
    }
  }, [currentWorkspace, loadReportData]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-text-secondary">
        {t('reports.loading')}
      </div>
    );
  }

  const summary = [
    { label: t('reports.totalTasks'), value: String(stats.totalTasks) },
    { label: t('reports.completed'), value: String(stats.completedTasks) },
    { label: t('reports.active'), value: String(stats.activeTasks) },
    { label: t('reports.completionRate'), value: `${stats.completionRate.toFixed(1)}%` },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title={t('reports.title')}
        description={t('reports.subtitle')}
        action={
          <button
            type="button"
            onClick={() => setShowExport(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('reports.exportData')}</span>
            <span className="sr-only sm:hidden">{t('reports.exportData')}</span>
          </button>
        }
      />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="min-w-0 bg-surface px-4 py-3">
            <dt className="truncate text-xs font-medium text-text-secondary">{item.label}</dt>
            <dd className="mt-1 text-xl font-semibold text-text-primary">{item.value}</dd>
          </div>
        ))}
      </dl>

      <ProductivityCharts
        tasksData={tasksData}
        priorityData={priorityData}
        categoryData={categoryData}
        completionRate={stats.completionRate}
      />

      <ExportDialog
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={rawTasks}
        dataType="tasks"
        defaultFilename="workhub-report"
      />
    </div>
  );
}
