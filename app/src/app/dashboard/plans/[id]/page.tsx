'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { differenceInCalendarDays, format } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import GanttTimeline from '@/components/plans/GanttTimeline';
import MilestoneEditor from '@/components/plans/MilestoneEditor';
import { PlanFormDialog, type Plan } from '@/components/plans/PlanFormDialog';
import { STATUS_BADGE, isMilestoneOverdue, parseDay, planProgress } from '@/components/plans/planUtils';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconMenu } from '@/components/ui/IconMenu';

interface LinkedTask {
  id: string;
  title: string;
  is_completed: boolean;
}

interface Milestone {
  id: string;
  plan_id: string;
  name: string;
  description: string;
  target_date: string;
  completion_percentage: number;
  is_completed: boolean;
  completed_at: string | null;
  order_index: number;
  tasks: LinkedTask[];
}

function asTasks(value: unknown): LinkedTask[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.filter((task): task is LinkedTask => {
    if (!task || typeof task !== 'object') return false;
    return 'id' in task && 'title' in task;
  });
}

function percent(milestone: Milestone) {
  return milestone.is_completed ? 100 : Math.max(0, Math.min(100, milestone.completion_percentage));
}

export default function PlanDetailPage() {
  const t = useTranslations('pages.plans');
  const { confirm, dialog } = useConfirm();
  const locale = useLocale();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const params = useParams();
  const planId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlan = useCallback(async () => {
    if (!planId) return;
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (data) setPlan(data);
    setLoading(false);
  }, [planId]);

  const loadMilestones = useCallback(async () => {
    if (!planId) return;
    const { data } = await supabase
      .from('plan_milestones')
      .select('*')
      .eq('plan_id', planId)
      .order('order_index');

    if (!data) {
      setMilestones([]);
      return;
    }

    const ids = data.map((row) => row.id as string);
    const tasksByMilestone = new Map<string, LinkedTask[]>();

    if (ids.length > 0) {
      const { data: links } = await supabase
        .from('milestone_tasks')
        .select('milestone_id, tasks!inner(id, title, is_completed)')
        .in('milestone_id', ids);

      for (const link of links ?? []) {
        const milestoneId = link.milestone_id as string;
        const list = tasksByMilestone.get(milestoneId) ?? [];
        list.push(...asTasks(link.tasks));
        tasksByMilestone.set(milestoneId, list);
      }
    }

    setMilestones(
      data
        .map((row) => ({
          id: row.id,
          plan_id: row.plan_id,
          name: row.name,
          description: row.description || '',
          target_date: row.target_date,
          completion_percentage: row.completion_percentage ?? 0,
          is_completed: Boolean(row.is_completed),
          completed_at: row.completed_at,
          order_index: row.order_index ?? 0,
          tasks: tasksByMilestone.get(row.id) ?? [],
        }))
        .sort((a, b) => a.target_date.localeCompare(b.target_date) || a.order_index - b.order_index)
    );
  }, [planId]);

  useEffect(() => {
    if (!planId) {
      setLoading(false);
      return;
    }
    loadPlan();
    loadMilestones();
  }, [planId, loadPlan, loadMilestones]);

  const deleteMilestone = async (id: string) => {
    if (!(await confirm({ title: t('deleteConfirm'), confirmLabel: t('deleteMilestone') }))) return;

    await supabase.from('plan_milestones').delete().eq('id', id);
    if (selectedId === id) setSelectedId(null);
    closeMilestone();
    loadMilestones();
  };

  const deletePlan = async () => {
    if (!plan || !(await confirm({ title: t('deletePlanConfirm'), confirmLabel: t('deletePlan') }))) return;
    const { error } = await supabase.from('plans').delete().eq('id', plan.id);
    if (error) {
      console.error(error);
      return;
    }
    router.push('/dashboard/plans');
  };

  const openMilestone = (milestone: Milestone | null) => {
    setEditingMilestone(milestone);
    setShowMilestoneModal(true);
  };

  const closeMilestone = () => {
    setShowMilestoneModal(false);
    setEditingMilestone(null);
  };

  const isWide = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;

  // On narrow screens the selection expands inline in the list; on xl it feeds the side panel.
  const toggleFromList = (id: string) => {
    setSelectedId((current) => (current === id && !isWide() ? null : id));
  };

  const selectFromTimeline = (id: string) => {
    setSelectedId(id);
    if (!isWide()) {
      window.setTimeout(() => {
        document.getElementById(`milestone-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 50);
    }
  };

  const defaultId = useMemo(() => {
    const next = milestones.find((milestone) => !milestone.is_completed);
    return (next ?? milestones[0])?.id ?? null;
  }, [milestones]);

  if (loading) {
    return (
      <div className="min-w-0 space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded-lg bg-surface-hover" />
        <div className="h-4 w-2/3 animate-pulse rounded-lg bg-surface-hover" />
        <div className="h-48 animate-pulse rounded-2xl bg-surface-hover" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-w-0 py-16 text-center">
        <h2 className="mb-3 text-xl font-semibold text-text-primary">{t('notFound')}</h2>
        <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/plans')}>
          {t('back')}
        </Button>
      </div>
    );
  }

  const daysRemaining = differenceInCalendarDays(parseDay(plan.end_date), new Date());
  const overallProgress = planProgress(milestones);
  const accent = plan.color || '#3b82f6';
  const panelMilestone =
    milestones.find((milestone) => milestone.id === (selectedId ?? defaultId)) ?? null;
  const planOpen = plan.status === 'active' || plan.status === 'draft';

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="space-y-4">
        <Link
          href="/dashboard/plans"
          className="inline-flex items-center gap-2 rounded text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('back')}
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-2.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-text-primary">{plan.name}</h1>
              <div className="mt-1.5">
                <Badge size="sm" variant={STATUS_BADGE[plan.status]}>
                  {t(`status.${plan.status}`)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" onClick={() => openMilestone(null)} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden />
              {t('addMilestone')}
            </Button>
            <IconMenu
              label={t('planActions')}
              items={[
                { label: t('editPlan'), onClick: () => setShowPlanForm(true) },
                { label: t('deletePlan'), onClick: deletePlan, danger: true },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-2">
            {plan.goal ? (
              <p className="text-base text-text-primary">
                <span className="text-text-secondary">{t('goal')}: </span>
                {plan.goal}
              </p>
            ) : null}
            {plan.description ? (
              <p className="whitespace-pre-line text-sm text-text-secondary">{plan.description}</p>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-text-secondary">{t('overallProgress')}</span>
              <span className="font-semibold tabular-nums text-text-primary">{overallProgress}%</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hover"
              role="progressbar"
              aria-valuenow={overallProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('overallProgress')}
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${overallProgress}%`, backgroundColor: accent }}
              />
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              {format(parseDay(plan.start_date), 'MMM d', { locale: dateLocale })}
              {' – '}
              {format(parseDay(plan.end_date), 'MMM d, yyyy', { locale: dateLocale })}
              {planOpen ? (
                <span className={daysRemaining < 0 ? 'font-medium text-danger' : ''}>
                  {' · '}
                  {daysRemaining < 0 ? t('ended') : t('daysLeft', { count: daysRemaining })}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {milestones.length > 0 ? (
        <div className="hidden min-w-0 overflow-hidden rounded-2xl border border-border bg-surface md:block">
          <GanttTimeline
            plan={plan}
            milestones={milestones}
            selectedId={selectedId ?? defaultId}
            onMilestoneClick={(milestone) => selectFromTimeline(milestone.id)}
          />
        </div>
      ) : null}

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-12">
        <section className="min-w-0 space-y-3 xl:col-span-7 2xl:col-span-8">
          <h2 className="text-base font-semibold text-text-primary">
            {t('milestones')}
            {milestones.length > 0 ? (
              <span className="ml-2 text-sm font-normal tabular-nums text-text-muted">{milestones.length}</span>
            ) : null}
          </h2>

          {milestones.length === 0 ? (
            <EmptyState title={t('noMilestones')} body={t('noMilestonesBody')} />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {milestones.map((milestone) => {
                const overdue = isMilestoneOverdue(milestone.target_date, milestone.is_completed);
                const pct = percent(milestone);
                const expanded = selectedId === milestone.id;
                const highlighted = (selectedId ?? defaultId) === milestone.id;
                const doneTasks = milestone.tasks.filter((task) => task.is_completed).length;

                return (
                  <li
                    key={milestone.id}
                    id={`milestone-${milestone.id}`}
                    className={highlighted ? 'xl:bg-primary/5' : ''}
                  >
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => toggleFromList(milestone.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      <StatusDot done={milestone.is_completed} overdue={overdue} accent={accent} />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-medium text-text-primary">{milestone.name}</span>
                        <span className={`mt-0.5 block text-xs ${overdue ? 'text-danger' : 'text-text-secondary'}`}>
                          {format(parseDay(milestone.target_date), 'MMM d, yyyy', { locale: dateLocale })}
                          {milestone.is_completed ? ` · ${t('legendCompleted')}` : ''}
                          {overdue ? ` · ${t('overdue')}` : ''}
                          {milestone.tasks.length > 0 ? ` · ${doneTasks}/${milestone.tasks.length}` : ''}
                        </span>
                      </span>
                      <span className="hidden w-32 shrink-0 items-center gap-2 sm:flex" aria-hidden>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: milestone.is_completed ? 'var(--brand-green)' : accent }}
                          />
                        </span>
                      </span>
                      <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-text-primary">
                        {pct}%
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-text-muted transition-transform xl:hidden ${expanded ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </button>

                    {expanded ? (
                      <div className="border-t border-border bg-background px-4 py-4 xl:hidden">
                        <MilestoneDetail
                          milestone={milestone}
                          onEdit={() => openMilestone(milestone)}
                          onDelete={() => deleteMilestone(milestone.id)}
                          embedded
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {panelMilestone ? (
          <aside className="hidden min-w-0 xl:sticky xl:top-20 xl:col-span-5 xl:block 2xl:col-span-4">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <MilestoneDetail
                milestone={panelMilestone}
                onEdit={() => openMilestone(panelMilestone)}
                onDelete={() => deleteMilestone(panelMilestone.id)}
              />
            </div>
          </aside>
        ) : null}
      </div>

      {showMilestoneModal ? (
        <MilestoneEditor
          planId={plan.id}
          milestone={editingMilestone}
          onClose={closeMilestone}
          onSave={() => {
            closeMilestone();
            loadMilestones();
          }}
          onDelete={editingMilestone ? () => deleteMilestone(editingMilestone.id) : undefined}
        />
      ) : null}

      <PlanFormDialog
        open={showPlanForm}
        plan={plan}
        onClose={() => setShowPlanForm(false)}
        onSaved={() => {
          setShowPlanForm(false);
          loadPlan();
        }}
      />
      {dialog}
    </div>
  );
}

function StatusDot({ done, overdue, accent }: { done: boolean; overdue: boolean; accent: string }) {
  const tone = done ? 'var(--brand-green)' : overdue ? 'var(--brand-red)' : accent;
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-white"
      style={{ borderColor: tone, backgroundColor: done ? tone : 'transparent' }}
      aria-hidden
    >
      {done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );
}

function MilestoneDetail({
  milestone,
  onEdit,
  onDelete,
  embedded = false,
}: {
  milestone: Milestone;
  onEdit: () => void;
  onDelete: () => void;
  embedded?: boolean;
}) {
  const t = useTranslations('pages.plans');
  const locale = useLocale();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const overdue = isMilestoneOverdue(milestone.target_date, milestone.is_completed);
  const done = milestone.tasks.filter((task) => task.is_completed).length;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {embedded ? null : (
            <h3 className="break-words text-lg font-semibold leading-snug text-text-primary">{milestone.name}</h3>
          )}
          <p className={`${embedded ? '' : 'mt-1 '}text-sm ${overdue ? 'text-danger' : 'text-text-secondary'}`}>
            {format(parseDay(milestone.target_date), 'EEEE, MMM d, yyyy', { locale: dateLocale })}
            {milestone.is_completed ? ` · ${t('legendCompleted')}` : ''}
            {overdue ? ` · ${t('overdue')}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
            {t('editMilestone')}
          </Button>
          <IconMenu
            label={t('milestoneActions')}
            items={[{ label: t('deleteMilestone'), onClick: onDelete, danger: true }]}
          />
        </div>
      </div>

      {milestone.description ? (
        <p className="whitespace-pre-line text-sm text-text-secondary">{milestone.description}</p>
      ) : null}

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h4 className="text-sm font-medium text-text-primary">{t('linkedTasks', { count: milestone.tasks.length })}</h4>
          {milestone.tasks.length > 0 ? (
            <span className="text-xs tabular-nums text-text-secondary">
              {done}/{milestone.tasks.length}
            </span>
          ) : null}
        </div>
        {milestone.tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-sm text-text-secondary">
            {t('noLinkedTasks')}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {milestone.tasks.map((task) => (
              <li key={task.id} className="flex min-w-0 items-center gap-3 px-3 py-2.5">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    task.is_completed ? 'border-success bg-success text-white' : 'border-text-muted'
                  }`}
                  aria-hidden
                >
                  {task.is_completed ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
                <span
                  className={`min-w-0 flex-1 break-words text-sm ${
                    task.is_completed ? 'text-text-muted line-through' : 'text-text-primary'
                  }`}
                >
                  {task.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
