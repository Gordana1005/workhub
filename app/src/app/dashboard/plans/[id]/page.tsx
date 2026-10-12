'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, differenceInDays } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import GanttTimeline from '@/components/plans/GanttTimeline';
import MilestoneEditor from '@/components/plans/MilestoneEditor';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconMenu } from '@/components/ui/IconMenu';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  color: string;
}

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

export default function PlanDetailPage() {
  const t = useTranslations('pages.plans');
  const locale = useLocale();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const params = useParams();
  const planId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
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
      data.map((row) => ({
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
    if (!confirm(t('deleteConfirm'))) return;

    await supabase.from('plan_milestones').delete().eq('id', id);
    loadMilestones();
  };

  const openMilestone = (milestone: Milestone | null) => {
    setEditingMilestone(milestone);
    setShowMilestoneModal(true);
  };

  const closeMilestone = () => {
    setShowMilestoneModal(false);
    setEditingMilestone(null);
  };

  if (loading) {
    return (
      <div className="min-w-0 space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded-lg bg-surface-hover" />
        <div className="h-4 w-2/3 animate-pulse rounded-lg bg-surface-hover" />
        <div className="h-28 animate-pulse rounded-2xl bg-surface-hover" />
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

  const daysRemaining = differenceInDays(new Date(plan.end_date), new Date());
  const overallProgress = milestones.length > 0
    ? Math.round(milestones.reduce((sum, milestone) => sum + milestone.completion_percentage, 0) / milestones.length)
    : 0;

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <button
        type="button"
        onClick={() => router.push('/dashboard/plans')}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </button>

      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div
            className="mt-2 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: plan.color || '#3b82f6' }}
          />
          <h1 className="min-w-0 flex-1 break-words text-2xl font-semibold tracking-tight text-text-primary">
            {plan.name}
          </h1>
        </div>
        {plan.description ? (
          <p className="mt-2 text-sm text-text-secondary">{plan.description}</p>
        ) : null}
        {plan.goal ? (
          <p className="mt-3 text-sm text-text-primary">
            <span className="text-text-secondary">{t('goal')}: </span>
            {plan.goal}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-text-secondary">
          {format(new Date(plan.start_date), 'MMM d', { locale: dateLocale })}
          {' – '}
          {format(new Date(plan.end_date), 'MMM d, yyyy', { locale: dateLocale })}
          {'. '}
          {t(`status.${plan.status}`)}
          {'. '}
          {t('overallProgress')}: {overallProgress}%. {t('daysLeft', { count: Math.max(daysRemaining, 0) })}.
        </p>
      </div>

      <div className="hidden min-w-0 lg:block">
        <div className="min-w-0 max-w-full overflow-x-auto rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-4 text-base font-semibold text-text-primary">{t('timeline')}</h2>
          <GanttTimeline
            plan={plan}
            milestones={milestones}
            onMilestoneClick={(milestone) => {
              const current = milestones.find((item) => item.id === milestone.id);
              if (current) openMilestone(current);
            }}
          />
        </div>
      </div>

      <section className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">{t('milestones')}</h2>
          <Button type="button" onClick={() => openMilestone(null)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('addMilestone')}
          </Button>
        </div>

        {milestones.length === 0 ? (
          <EmptyState title={t('noMilestones')} />
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone) => {
              const overdue = !milestone.is_completed && new Date(milestone.target_date) < new Date();
              return (
                <article key={milestone.id} className="min-w-0 rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-base font-semibold text-text-primary">{milestone.name}</h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        {format(new Date(milestone.target_date), 'MMM d, yyyy', { locale: dateLocale })}
                        {milestone.is_completed ? ` · ${t('legendCompleted')}` : ''}
                        {overdue ? ` · ${t('overdue')}` : ''}
                      </p>
                    </div>
                    <IconMenu
                      label={t('editMilestone')}
                      items={[
                        { label: t('editMilestone'), onClick: () => openMilestone(milestone) },
                        { label: t('deleteMilestone'), onClick: () => deleteMilestone(milestone.id), danger: true },
                      ]}
                    />
                  </div>

                  {milestone.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{milestone.description}</p>
                  ) : null}

                  <div className="mt-3 space-y-1.5">
                    {milestone.tasks.length === 0 ? (
                      <p className="text-sm text-text-secondary">{t('noLinkedTasks')}</p>
                    ) : (
                      milestone.tasks.map((task) => (
                        <div key={task.id} className="flex min-w-0 items-center gap-2">
                          {task.is_completed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                          )}
                          <span className={`min-w-0 truncate text-sm ${task.is_completed ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                            {task.title}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showMilestoneModal && plan ? (
        <MilestoneEditor
          planId={plan.id}
          milestone={editingMilestone}
          onClose={() => {
            closeMilestone();
            loadMilestones();
          }}
          onSave={() => {
            closeMilestone();
            loadMilestones();
          }}
        />
      ) : null}
    </div>
  );
}
