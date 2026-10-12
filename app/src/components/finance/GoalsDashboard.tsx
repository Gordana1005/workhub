'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, TrendingUp, Plus } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import GoalBuilder from './GoalBuilder';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';
import { IconMenu } from '@/components/ui/IconMenu';

export default function GoalsDashboard() {
  const t = useTranslations('pages.tools');
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalBuilder, setShowGoalBuilder] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('finance_goals')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data) setGoals(data);
    setLoading(false);
  };

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
        const { data: { user } } = await supabase.auth.getUser();
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
      alert(t('finance.saveGoalFailed'));
    }
  };

  const updateGoalProgress = async (goalId: string, currentAmount: number, newAmount: number) => {
    const updated = currentAmount + newAmount;

    const { error } = await supabase
      .from('finance_goals')
      .update({
        current_amount: updated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId);

    if (!error) {
      await loadGoals();
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!confirm(t('finance.deleteGoalConfirm'))) return;

    const { error } = await supabase
      .from('finance_goals')
      .delete()
      .eq('id', goalId);

    if (!error) {
      await loadGoals();
    }
  };

  return (
    <div className="min-w-0">
      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-text-secondary">{t('finance.loadingGoals')}</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <Target className="mx-auto mb-4 h-12 w-12 text-text-muted" />
          <h3 className="text-lg font-semibold text-text-primary">{t('finance.noGoalsTitle')}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">{t('finance.noGoalsBody')}</p>
          <button
            type="button"
            onClick={() => { setEditingGoal(null); setShowGoalBuilder(true); }}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            {t('finance.createFirstGoal')}
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-text-primary">{t('finance.financialGoals')}</h2>
            <button
              type="button"
              onClick={() => { setEditingGoal(null); setShowGoalBuilder(true); }}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              {t('finance.newGoal')}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {goals.map(goal => {
              const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
              const remaining = goal.target_amount - goal.current_amount;
              const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;
              const isComplete = progress >= 100;
              const isOverdue = daysLeft !== null && daysLeft < 0 && !isComplete;

              return (
                <article key={goal.id} className="min-w-0 rounded-2xl border border-border bg-surface p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-lg font-semibold text-text-primary">{goal.name}</h3>
                      {goal.description && (
                        <p className="mt-1 break-words text-sm text-text-secondary">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        isComplete
                          ? 'bg-green-500/10 text-green-600'
                          : progress >= 75
                          ? 'bg-primary/10 text-primary'
                          : isOverdue
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-surface-hover text-text-secondary'
                      }`}>
                        {progress.toFixed(0)}%
                      </div>
                      <IconMenu
                        label={t('finance.moreActions')}
                        items={[
                          { label: t('finance.update'), onClick: () => { setEditingGoal(goal); setShowGoalBuilder(true); } },
                          { label: t('finance.remove'), onClick: () => deleteGoal(goal.id), danger: true },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className={`h-full ${isComplete ? 'bg-green-600' : 'bg-primary'}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between gap-3 text-sm text-text-secondary">
                      <span>${goal.current_amount.toLocaleString()}</span>
                      <span>${goal.target_amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <dl className="mb-4 divide-y divide-border rounded-xl border border-border text-sm">
                    <div className="flex items-center justify-between gap-3 px-3 py-2">
                      <dt className="text-text-secondary">{t('finance.remaining')}</dt>
                      <dd className="font-semibold text-text-primary">${Math.max(remaining, 0).toLocaleString()}</dd>
                    </div>
                    {daysLeft !== null && (
                      <div className="flex items-center justify-between gap-3 px-3 py-2">
                        <dt className="text-text-secondary">
                          {daysLeft < 0 ? t('finance.overdue') : t('finance.daysLeft')}
                        </dt>
                        <dd className={`font-semibold ${daysLeft < 0 ? 'text-red-600' : 'text-text-primary'}`}>
                          {Math.abs(daysLeft)}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {!isComplete ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="number"
                        step="0.01"
                        placeholder={t('finance.addAmountPlaceholder')}
                        className="min-w-0 flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            const amount = parseFloat(input.value);
                            if (amount > 0) {
                              updateGoalProgress(goal.id, goal.current_amount, amount);
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const amount = parseFloat(input.value);
                          if (amount > 0) {
                            updateGoalProgress(goal.id, goal.current_amount, amount);
                            input.value = '';
                          }
                        }}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                      >
                        {t('finance.add')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 py-3 text-green-600">
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-medium">{t('finance.goalAchieved')}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      <Dialog
        open={showGoalBuilder}
        title={t('finance.goalCalculator')}
        onClose={closeBuilder}
        size="lg"
      >
        <GoalBuilder
          key={editingGoal?.id || 'new'}
          onSave={handleSaveGoal}
          onCancel={closeBuilder}
          initialData={editingGoal}
        />
      </Dialog>
    </div>
  );
}
