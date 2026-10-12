'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  color: string;
}

export const PLAN_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f43f5e', '#6366f1',
];

const fieldClass =
  'w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-11 min-w-0 sm:min-h-10 sm:text-sm';

export function PlanFormDialog({
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
  const [color, setColor] = useState(PLAN_COLORS[0]);
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
    setColor(plan?.color || PLAN_COLORS[0]);
    setStatus(plan?.status ?? 'draft');
  }, [open, plan]);

  const datesInvalid = Boolean(startDate && endDate && endDate < startDate);
  const canSave = Boolean(name.trim() && startDate && endDate) && !datesInvalid && !saving;

  const handleSave = async () => {
    if (!canSave || !currentWorkspace?.id) return;

    setSaving(true);
    const fields = {
      name: name.trim(),
      description,
      goal,
      start_date: startDate,
      end_date: endDate,
      color,
      status,
    };

    const { error } = plan
      ? await supabase.from('plans').update(fields).eq('id', plan.id)
      : await supabase.from('plans').insert({ workspace_id: currentWorkspace.id, ...fields });

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
        <>
          <Button type="button" variant="secondary" className="h-11 sm:h-10" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" form="plan-form" className="h-12 sm:h-10" disabled={!canSave}>
            {saving ? (plan ? t('saving') : t('creating')) : plan ? t('saveChanges') : t('createPlan')}
          </Button>
        </>
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
            enterKeyHint="next"
            autoFocus
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
            enterKeyHint="done"
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
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              aria-invalid={datesInvalid}
            />
          </label>
        </div>
        {datesInvalid ? (
          <p role="alert" className="-mt-2 text-sm text-danger">
            {t('dateOrderError')}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="mt-2 flex flex-wrap gap-2.5 sm:gap-2">
              {PLAN_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={swatch}
                  aria-pressed={color === swatch}
                  onClick={() => setColor(swatch)}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg text-white transition-transform hover:scale-105 active:scale-95 sm:h-8 sm:w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                    color === swatch ? 'ring-2 ring-text-primary ring-offset-2 ring-offset-surface' : ''
                  }`}
                  style={{ backgroundColor: swatch }}
                >
                  {color === swatch ? <Check className="h-4 w-4" aria-hidden /> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
