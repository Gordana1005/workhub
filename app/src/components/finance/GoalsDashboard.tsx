'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, Target } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { getSessionUser } from '@/lib/auth-client'
import { useLocaleSwitch } from '@/i18n/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import CollapsibleSection from './CollapsibleSection';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { IconMenu } from '@/components/ui/IconMenu';
import GoalBuilder from './GoalBuilder';
import { formatMoney, toNumber } from './money';

function AddAmount({ onAdd, label, placeholder }: { onAdd: (amount: number) => void; label: string; placeholder: string }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const amount = parseFloat(value);
        if (amount > 0) {
          onAdd(amount);
          setValue('');
        }
      }}
    >
      <input
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 min-w-0 flex-1 rounded-lg border border-border-control bg-secondary px-3 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:h-9 sm:text-sm"
      />
      <Button type="submit" size="sm" variant="secondary" className="h-11 sm:h-9" disabled={!(parseFloat(value) > 0)}>
        {label}
      </Button>
    </form>
  );
}

export default function GoalsDashboard({ currency = 'USD' }: { currency?: string }) {
  const t = useTranslations('pages.tools');
  const toast = useToast();
  const tc = useTranslations('common');
  const { confirm, dialog } = useConfirm();
  const { locale } = useLocaleSwitch();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalBuilder, setShowGoalBuilder] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  const loadGoals = useCallback(async () => {
    const { data } = await supabase
      .from('finance_goals')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data) setGoals(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const closeBuilder = useCallback(() => {
    setShowGoalBuilder(false);
    setEditingGoal(null);
  }, []);

  const handleSaveGoal = async (goalData: any) => {
    try {
      if (editingGoal) {
        const { error } = await supabase
          .from('finance_goals')
          .update({
            name: goalData.name,
            description: goalData.description,
            target_amount: goalData.target_amount,
            current_amount: goalData.current_amount,
            target_date: goalData.target_date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingGoal.id);

        if (error) throw error;
      } else {
        const user = await getSessionUser();
        const { error } = await supabase
          .from('finance_goals')
          .insert({
            name: goalData.name,
            description: goalData.description,
            target_amount: goalData.target_amount,
            current_amount: goalData.current_amount,
            target_date: goalData.target_date,
            user_id: user?.id,
            workspace_id: (await supabase.from('workspace_members').select('workspace_id').eq('user_id', user?.id).single()).data?.workspace_id,
          });

        if (error) throw error;
      }

      closeBuilder();
      await loadGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error(t('finance.saveGoalFailed'));
    }
  };

  const updateGoalProgress = async (goalId: string, currentAmount: number, addedAmount: number) => {
    const { error } = await supabase
      .from('finance_goals')
      .update({
        current_amount: currentAmount + addedAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId);

    if (!error) await loadGoals();
  };

  const deleteGoal = async (goalId: string) => {
    if (!(await confirm({ title: t('finance.deleteGoalConfirm'), confirmLabel: tc('delete') }))) return;

    const { error } = await supabase.from('finance_goals').delete().eq('id', goalId);
    if (!error) await loadGoals();
  };

  const openNew = () => {
    setEditingGoal(null);
    setShowGoalBuilder(true);
  };

  return (
    <CollapsibleSection
      title={t('finance.financialGoals')}
      icon={<Target aria-hidden="true" />}
      meta={goals.length > 0 ? goals.length : undefined}
      actions={
        <Button type="button" variant="ghost" size="sm" onClick={openNew} className="h-10 gap-1 sm:h-8">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('finance.newGoal')}
        </Button>
      }
    >

      {loading ? (
        <div className="space-y-3 px-4 pb-5 pt-2" role="status" aria-label={t('finance.loadingGoals')}>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ) : goals.length === 0 ? (
        <div className="px-4 pb-5 pt-2 text-center">
          <p className="text-sm font-medium text-text-primary">{t('finance.noGoalsTitle')}</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-text-secondary">{t('finance.noGoalsBody')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {goals.map((goal) => {
            const target = toNumber(goal.target_amount);
            const current = toNumber(goal.current_amount);
            const progress = target > 0 ? (current / target) * 100 : 0;
            const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;
            const isComplete = progress >= 100;
            const isOverdue = daysLeft !== null && daysLeft < 0 && !isComplete;

            return (
              <li key={goal.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-text-primary">{goal.name}</h3>
                    {goal.description ? (
                      <p className="mt-0.5 line-clamp-2 break-words text-xs text-text-secondary">{goal.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        isComplete
                          ? 'bg-success/10 text-success'
                          : isOverdue
                          ? 'bg-danger/10 text-danger'
                          : 'bg-surface-hover text-text-secondary'
                      }`}
                    >
                      {Math.round(progress)}%
                    </span>
                    <IconMenu
                      label={t('finance.moreActions')}
                      items={[
                        { label: t('finance.edit'), onClick: () => { setEditingGoal(goal); setShowGoalBuilder(true); } },
                        { label: t('finance.remove'), onClick: () => deleteGoal(goal.id), danger: true },
                      ]}
                    />
                  </div>
                </div>

                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-surface-hover"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(Math.round(progress), 100)}
                  aria-label={goal.name}
                >
                  <div
                    className={`h-full rounded-full transition-[width] ${isComplete ? 'bg-success' : 'bg-primary'}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-text-secondary">
                  <span className="tabular-nums">
                    {formatMoney(current, currency, locale, true)} / {formatMoney(target, currency, locale, true)}
                  </span>
                  {daysLeft !== null && !isComplete ? (
                    <span className={isOverdue ? 'text-danger' : ''}>
                      {isOverdue ? t('finance.overdue') : t('finance.daysLeft')}: {Math.abs(daysLeft)}
                    </span>
                  ) : null}
                </div>

                {isComplete ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-success">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t('finance.goalAchieved')}
                  </p>
                ) : (
                  <AddAmount
                    label={t('finance.add')}
                    placeholder={t('finance.addAmountPlaceholder')}
                    onAdd={(amount) => updateGoalProgress(goal.id, current, amount)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showGoalBuilder ? (
        <GoalBuilder
          key={editingGoal?.id || 'new'}
          onSave={handleSaveGoal}
          onCancel={closeBuilder}
          initialData={editingGoal}
          currency={currency}
        />
      ) : null}
    </CollapsibleSection>
  );
}
