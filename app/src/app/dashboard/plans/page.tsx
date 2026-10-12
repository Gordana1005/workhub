'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { differenceInCalendarDays, format } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconMenu } from '@/components/ui/IconMenu';
import { PageHeader } from '@/components/ui/PageHeader';
import { PlanFormDialog, type Plan } from '@/components/plans/PlanFormDialog';
import { STATUS_BADGE, parseDay, planProgress } from '@/components/plans/planUtils';

interface MilestoneSummary {
  plan_id: string;
  name: string;
  target_date: string;
  completion_percentage: number;
  is_completed: boolean;
}

type Filter = 'all' | Plan['status'];

const STATUS_ORDER: Plan['status'][] = ['active', 'draft', 'completed', 'cancelled'];

export default function PlansPage() {
  const t = useTranslations('pages.plans');
  const { confirm, dialog } = useConfirm();
  const locale = useLocale();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [milestones, setMilestones] = useState<MilestoneSummary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const { currentWorkspace } = useWorkspaceStore();

  const loadPlans = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('start_date', { ascending: false });

    const list = (data ?? []) as Plan[];
    setPlans(list);

    if (list.length > 0) {
      const { data: rows } = await supabase
        .from('plan_milestones')
        .select('plan_id, name, target_date, completion_percentage, is_completed')
        .in('plan_id', list.map((plan) => plan.id));
      setMilestones(
        ((rows ?? []) as MilestoneSummary[]).map((row) => ({
          ...row,
          completion_percentage: row.completion_percentage ?? 0,
          is_completed: Boolean(row.is_completed),
        }))
      );
    } else {
      setMilestones([]);
    }
    setLoading(false);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadPlans();
    }
  }, [currentWorkspace?.id, loadPlans]);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingPlan(null);
  }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setShowForm(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const deletePlan = async (id: string) => {
    if (!(await confirm({ title: t('deletePlanConfirm'), confirmLabel: t('deletePlan') }))) return;
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) {
      console.error(error);
      return;
    }
    loadPlans();
  };

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: plans.length };
    for (const plan of plans) result[plan.status] = (result[plan.status] ?? 0) + 1;
    return result;
  }, [plans]);

  const visible = useMemo(() => {
    const filtered = filter === 'all' ? plans : plans.filter((plan) => plan.status === filter);
    return [...filtered].sort((a, b) => {
      const byStatus = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      if (byStatus !== 0) return byStatus;
      return b.start_date.localeCompare(a.start_date);
    });
  }, [plans, filter]);

  const filters: Filter[] = ['all', ...STATUS_ORDER.filter((status) => (counts[status] ?? 0) > 0)];
  const activeFilter: Filter = filters.includes(filter) ? filter : 'all';

  const dateLabel = (plan: Plan) =>
    `${format(parseDay(plan.start_date), 'MMM d', { locale: dateLocale })} – ${format(parseDay(plan.end_date), 'MMM d, yyyy', { locale: dateLocale })}`;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={
          <Button type="button" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            {t('newPlan')}
          </Button>
        }
      />

      {!loading && plans.length > 0 && filters.length > 2 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('statusLabel')}>
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={activeFilter === item}
              onClick={() => setFilter(item)}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeFilter === item
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              {item === 'all' ? t('filterAll') : t(`status.${item}`)}
              <span className="text-xs tabular-nums opacity-70">{counts[item] ?? 0}</span>
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-44 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Button type="button" onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden />
              {t('createPlan')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((plan) => {
            const own = milestones.filter((milestone) => milestone.plan_id === plan.id);
            const done = own.filter((milestone) => milestone.is_completed).length;
            const progress = planProgress(own);
            const daysLeft = differenceInCalendarDays(parseDay(plan.end_date), new Date());
            const next = own
              .filter((milestone) => !milestone.is_completed)
              .sort((a, b) => a.target_date.localeCompare(b.target_date))[0];
            const open = plan.status === 'active' || plan.status === 'draft';
            const accent = plan.color || '#3b82f6';

            return (
              <article
                key={plan.id}
                className="group relative flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 pl-5 transition-[border-color,box-shadow] duration-150 hover:border-primary/40 hover:shadow-md focus-within:border-primary/60"
              >
                <span className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ backgroundColor: accent }} aria-hidden />

                <div className="flex items-start gap-2">
                  <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug text-text-primary">
                    <Link
                      href={`/dashboard/plans/${plan.id}`}
                      className="break-words rounded after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-primary focus-visible:after:rounded-2xl"
                    >
                      {plan.name}
                    </Link>
                  </h2>
                  <div className="relative z-10 -mr-2 -mt-1.5">
                    <IconMenu
                      label={t('planActions')}
                      items={[
                        { label: t('editPlan'), onClick: () => openEdit(plan) },
                        { label: t('deletePlan'), onClick: () => deletePlan(plan.id), danger: true },
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-1.5">
                  <Badge size="sm" variant={STATUS_BADGE[plan.status]}>
                    {t(`status.${plan.status}`)}
                  </Badge>
                </div>

                {plan.goal || plan.description ? (
                  <p className="mt-3 line-clamp-2 text-sm text-text-secondary">{plan.goal || plan.description}</p>
                ) : null}

                <div className="mt-auto pt-4">
                  <div className="flex items-baseline justify-between gap-3 text-xs text-text-secondary">
                    <span>
                      {own.length > 0 ? t('milestonesDone', { done, total: own.length }) : t('noMilestones')}
                    </span>
                    <span className="font-medium tabular-nums text-text-primary">{progress}%</span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-hover"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('overallProgress')}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${progress}%`, backgroundColor: accent }}
                    />
                  </div>

                  {next ? (
                    <p className="mt-3 truncate text-xs text-text-secondary">
                      <span className="text-text-muted">{t('nextMilestone')}: </span>
                      <span className="text-text-primary">{next.name}</span>
                      {' · '}
                      {format(parseDay(next.target_date), 'MMM d', { locale: dateLocale })}
                    </p>
                  ) : null}

                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
                    <span>{dateLabel(plan)}</span>
                    {open ? (
                      <span className={daysLeft < 0 ? 'font-medium text-danger' : 'text-text-muted'}>
                        · {daysLeft < 0 ? t('ended') : t('daysLeft', { count: daysLeft })}
                      </span>
                    ) : null}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <PlanFormDialog
        open={showForm}
        plan={editingPlan}
        onClose={closeForm}
        onSaved={() => {
          closeForm();
          loadPlans();
        }}
      />
      {dialog}
    </div>
  );
}
