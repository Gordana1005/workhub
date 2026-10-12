'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconMenu } from '@/components/ui/IconMenu';
import { PageHeader } from '@/components/ui/PageHeader';

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

const fieldClass =
  'w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const colors = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f43f5e', '#6366f1',
];

export default function PlansPage() {
  const t = useTranslations('pages.plans');
  const locale = useLocale();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentWorkspace } = useWorkspaceStore();
  const router = useRouter();

  const loadPlans = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('start_date', { ascending: false });

    if (data) setPlans(data);
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
    if (!confirm(t('deletePlanConfirm'))) return;
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) {
      console.error(error);
      return;
    }
    loadPlans();
  };

  const dateLabel = (plan: Plan) => {
    return `${format(new Date(plan.start_date), 'MMM d', { locale: dateLocale })} – ${format(new Date(plan.end_date), 'MMM d, yyyy', { locale: dateLocale })}`;
  };

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={
          <Button type="button" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('newPlan')}
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Button type="button" onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('createPlan')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary/40"
              onClick={() => router.push(`/dashboard/plans/${plan.id}`)}
            >
              <div
                className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: plan.color || '#3b82f6' }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <h2 className="min-w-0 flex-1 break-words text-base font-semibold text-text-primary">{plan.name}</h2>
                  <IconMenu
                    label={t('editPlan')}
                    items={[
                      { label: t('editPlan'), onClick: () => openEdit(plan) },
                      { label: t('deletePlan'), onClick: () => deletePlan(plan.id), danger: true },
                    ]}
                  />
                </div>
                {plan.goal ? (
                  <p className="mt-1 line-clamp-1 text-sm text-text-secondary">{plan.goal}</p>
                ) : null}
                <p className="mt-2 text-sm text-text-secondary">
                  {t(`status.${plan.status}`)} · {dateLabel(plan)}
                </p>
              </div>
            </div>
          ))}
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
    </div>
  );
}

function PlanFormDialog({
  open,
  plan,
  onClose,
  onSaved,
}: {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('pages.plans');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [status, setStatus] = useState<Plan['status']>('draft');
  const [saving, setSaving] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (!open) return;
    setName(plan?.name ?? '');
    setDescription(plan?.description ?? '');
    setGoal(plan?.goal ?? '');
    setStartDate(plan?.start_date ? plan.start_date.slice(0, 10) : '');
    setEndDate(plan?.end_date ? plan.end_date.slice(0, 10) : '');
    setColor(plan?.color || '#3b82f6');
    setStatus(plan?.status ?? 'draft');
  }, [open, plan]);

  const handleSave = async () => {
    if (!name || !startDate || !endDate || !currentWorkspace?.id) return;

    setSaving(true);
    const fields = {
      name,
      description,
      goal,
      start_date: startDate,
      end_date: endDate,
      color,
      status,
    };

    const { error } = plan
      ? await supabase.from('plans').update(fields).eq('id', plan.id)
      : await supabase.from('plans').insert({
          workspace_id: currentWorkspace.id,
          name,
          description,
          goal,
          start_date: startDate,
          end_date: endDate,
          color,
          status,
        });

    if (!error) onSaved();
    setSaving(false);
  };

  return (
    <Dialog
      open={open}
      title={plan ? t('editPlanTitle') : t('createTitle')}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form="plan-form"
            className="flex-1"
            disabled={!name || !startDate || !endDate || saving}
          >
            {saving ? (plan ? t('saving') : t('creating')) : plan ? t('saveChanges') : t('createPlan')}
          </Button>
        </div>
      }
    >
      <form
        id="plan-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <label className="block text-sm text-text-secondary">
          {t('planName')}
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`${fieldClass} mt-1.5`}
            placeholder={t('planNamePlaceholder')}
          />
        </label>

        <label className="block text-sm text-text-secondary">
          {t('description')}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${fieldClass} mt-1.5`}
            placeholder={t('descriptionPlaceholder')}
            rows={3}
          />
        </label>

        <label className="block text-sm text-text-secondary">
          {t('goal')}
          <input
            type="text"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className={`${fieldClass} mt-1.5`}
            placeholder={t('goalPlaceholder')}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm text-text-secondary">
            {t('startDate')}
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className={`${fieldClass} mt-1.5`}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('endDate')}
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className={`${fieldClass} mt-1.5`}
            />
          </label>
        </div>

        <label className="block text-sm text-text-secondary">
          {t('statusLabel')}
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as Plan['status'])}
            className={`${fieldClass} mt-1.5`}
          >
            <option value="draft">{t('status.draft')}</option>
            <option value="active">{t('status.active')}</option>
            <option value="completed">{t('status.completed')}</option>
            <option value="cancelled">{t('status.cancelled')}</option>
          </select>
        </label>

        <div>
          <p className="text-sm text-text-secondary">{t('color')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={color === swatch}
                onClick={() => setColor(swatch)}
                className={`h-8 w-8 rounded-lg ${color === swatch ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}`}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
