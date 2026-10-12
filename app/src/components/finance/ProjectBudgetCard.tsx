'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Check, X, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getSessionUser } from '@/lib/auth-client'
import BudgetRequestForm from './BudgetRequestForm';
import BudgetRequestsList from './BudgetRequestsList';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import { IconMenu } from '@/components/ui/IconMenu';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';
import { formatMoney } from './money';

interface ProjectBudgetCardProps {
  projectId: string;
}

interface ProjectFinancials {
  project_id: string;
  project_name: string;
  budget: number | null;
  budget_currency: string;
  hourly_rate: number | null;
  total_expenses: number;
  total_income: number;
  remaining_budget: number;
  budget_used_percentage: number;
  total_hours: number;
  billable_amount: number;
  profit: number;
  transaction_count: number;
  time_entry_count: number;
  pending_requests_amount: number;
  pending_requests_count: number;
  approved_requests_amount: number;
  paid_requests_amount: number;
}

export default function ProjectBudgetCard({ projectId }: ProjectBudgetCardProps) {
  const t = useTranslations('pages.tools');
  const toast = useToast();
  const { locale } = useLocaleSwitch();
  const [financials, setFinancials] = useState<ProjectFinancials | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showRequestsList, setShowRequestsList] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    budget: '',
    hourly_rate: '',
  });
  const [loading, setLoading] = useState(true);

  const checkIfOwner = useCallback(async () => {
    const user = await getSessionUser();
    if (!user) return;

    const { data } = await supabase
      .from('projects')
      .select('creator_id')
      .eq('id', projectId)
      .single();

    setIsOwner(data?.creator_id === user.id);
  }, [projectId]);

  const loadFinancials = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('project_financials')
      .select('*')
      .eq('project_id', projectId)
      .single();


    if (data) {
      setFinancials(data);
      // Always update form with latest values
      const newBudgetForm = {
        budget: data.budget?.toString() || '',
        hourly_rate: data.hourly_rate?.toString() || '',
      };
      setBudgetForm(newBudgetForm);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadFinancials();
    checkIfOwner();
  }, [projectId, loadFinancials, checkIfOwner]);

  const handleSaveBudget = async () => {
    try {
      
      const updateData: any = {};
      if (budgetForm.budget) {
        updateData.budget = parseFloat(budgetForm.budget);
      }
      if (budgetForm.hourly_rate) {
        updateData.hourly_rate = parseFloat(budgetForm.hourly_rate);
      }


      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select();


      if (error) throw error;

      // Wait for database view to refresh
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Reload financials from server
      await loadFinancials();
      
      // Close edit mode after data is loaded
      setIsEditing(false);
      
      toast.success(t('finance.budgetSaved'));
    } catch (error: any) {
      console.error('Failed to save budget:', error);
      toast.error(t('finance.budgetSaveFailed', { message: error.message || t('finance.unknownError') }));
    }
  };

  if (loading) {
    return (
      <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <div className="space-y-4" role="status" aria-busy="true">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (!financials) return null;

  const money = (value: number | null | undefined) =>
    formatMoney(Number(value) || 0, financials.budget_currency || 'USD', locale);
  const hasBudget = financials.budget && financials.budget > 0;
  const budgetPercentage = hasBudget ? Math.min(financials.budget_used_percentage, 100) : 0;
  const isOverBudget = hasBudget && financials.budget_used_percentage > 100;
  const isNearLimit = hasBudget && financials.budget_used_percentage > 80;

  // Show setup form if no budget configured
  if (!hasBudget && !isEditing) {
    return (
      <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-text-primary">{t('finance.projectBudget')}</h3>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex min-h-11 items-center self-start rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover active:bg-primary-active sm:min-h-10"
          >
            {t('finance.setBudget')}
          </button>
        </div>
        <p className="text-text-secondary text-sm">
          {t('finance.setBudgetHelp')}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-lg font-semibold text-text-primary">{t('finance.projectBudget')}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {isOverBudget && (
            <div className="flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1 text-sm text-danger">
              <AlertTriangle className="h-4 w-4" />
              {t('finance.overBudget')}
            </div>
          )}
          {!isEditing ? (
            <IconMenu
              label={t('finance.moreActions')}
              items={[
                { label: t('finance.editBudget'), onClick: () => setIsEditing(true) },
                { label: t('finance.addExpense'), onClick: () => { window.location.href = `/dashboard/finance?project=${projectId}&type=expense`; } },
                { label: t('finance.addIncome'), onClick: () => { window.location.href = `/dashboard/finance?project=${projectId}&type=income`; } },
              ]}
            />
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveBudget}
                aria-label={t('finance.update')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-hover active:bg-primary-active sm:h-9 sm:w-9"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={t('finance.cancel')}
                onClick={() => {
                  setIsEditing(false);
                  setBudgetForm({
                    budget: financials.budget?.toString() || '',
                    hourly_rate: financials.hourly_rate?.toString() || '',
                  });
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border-strong bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary active:bg-tertiary sm:h-9 sm:w-9"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {t('finance.projectBudgetAmount', { currency: financials.budget_currency })}
            </label>
            <input
              type="number"
              step="0.01"
              value={budgetForm.budget}
              onChange={(e) => setBudgetForm({ ...budgetForm, budget: e.target.value })}
              placeholder="10000.00"
              className="block min-h-11 w-full min-w-0 px-3 py-2.5 bg-secondary border border-border-control rounded-lg text-base text-text-primary placeholder:text-text-muted sm:text-sm"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {t('finance.hourlyRate', { currency: financials.budget_currency })}
            </label>
            <input
              type="number"
              step="0.01"
              value={budgetForm.hourly_rate}
              onChange={(e) => setBudgetForm({ ...budgetForm, hourly_rate: e.target.value })}
              placeholder="75.00"
              className="block min-h-11 w-full min-w-0 px-3 py-2.5 bg-secondary border border-border-control rounded-lg text-base text-text-primary placeholder:text-text-muted sm:text-sm"
              inputMode="decimal"
            />
            <p className="mt-1 text-xs text-text-secondary">
              {t('finance.hourlyRateHint')}
            </p>
          </div>
        </div>
      ) : (
        <>
          {hasBudget && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">{t('finance.budgetUsed')}</span>
                <span className="text-sm font-medium text-text-primary">
                  {money(financials.total_expenses)} / {money(financials.budget)}
                </span>
              </div>
              <div className="h-3 bg-surface-hover rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isOverBudget
                      ? 'bg-danger'
                      : isNearLimit
                      ? 'bg-warning'
                      : 'bg-success'
                  }`}
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-text-secondary text-right">
                {t('finance.percentUsed', { percent: budgetPercentage.toFixed(1) })}
              </div>
            </div>
          )}

          {/* Financial summary */}
          <dl className="mb-6 divide-y divide-border rounded-xl border border-border text-sm">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <dt className="text-text-secondary">{t('finance.remaining')}</dt>
                {hasBudget && (
                  <dd className="text-xs text-text-secondary">{t('finance.transactionCount', { count: financials.transaction_count })}</dd>
                )}
              </div>
              <dd className={`shrink-0 font-semibold ${financials.remaining_budget < 0 ? 'text-danger' : 'text-text-primary'}`}>{money(Math.abs(financials.remaining_budget))}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <dt className="text-text-secondary">{t('finance.income')}</dt>
              </div>
              <dd className="shrink-0 font-semibold text-text-primary">{money(financials.total_income)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <dt className="text-text-secondary">{t('finance.pendingRequests')}</dt>
                <dd className="text-xs text-text-secondary">{t('finance.requestsCount', { count: financials.pending_requests_count || 0 })}</dd>
              </div>
              <dd className="shrink-0 font-semibold text-warning">{money(financials.pending_requests_amount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <dt className="text-text-secondary">{t('finance.approved')}</dt>
                <dd className="text-xs text-text-secondary">{t('finance.paidAmount', { amount: money(financials.paid_requests_amount) })}</dd>
              </div>
              <dd className="shrink-0 font-semibold text-text-primary">{money(financials.approved_requests_amount)}</dd>
            </div>
            {financials.hourly_rate && financials.hourly_rate > 0 && (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <dt className="text-text-secondary">{t('finance.billableHours')}</dt>
                  <dd className="text-xs text-text-secondary">
                    {t('finance.billableValue', { amount: money(financials.billable_amount), rate: money(financials.hourly_rate) })}
                  </dd>
                </div>
                <dd className="shrink-0 font-semibold text-text-primary">{financials.total_hours.toFixed(1)}h</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <dt className="text-text-secondary">{t('finance.profitLoss')}</dt>
              <dd className={`shrink-0 font-semibold ${financials.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                {financials.profit >= 0 ? '+' : '-'}{money(Math.abs(financials.profit))}
              </dd>
            </div>
          </dl>

          {/* Budget Requests Section */}
          {hasBudget && (
            <div>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h4 className="flex items-center gap-2 text-base font-semibold text-text-primary">
                  <FileText className="h-5 w-5 shrink-0" />
                  {t('finance.budgetRequests')}
                </h4>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(true)}
                    className="inline-flex min-h-11 items-center justify-center px-4 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-lg text-sm transition-colors sm:min-h-10"
                  >
                    {t('finance.requestBudget')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRequestsList(!showRequestsList)}
                    className="inline-flex min-h-11 items-center justify-center px-4 bg-surface hover:bg-surface-hover active:bg-tertiary text-text-primary rounded-lg text-sm transition-colors border border-border-strong sm:min-h-10"
                  >
                    {showRequestsList ? t('finance.hideRequests') : t('finance.viewRequests')}
                  </button>
                </div>
              </div>

              {showRequestsList && (
                <BudgetRequestsList
                  projectId={projectId}
                  isOwner={isOwner}
                  onUpdate={loadFinancials}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Request Form Modal */}
      {showRequestForm && (
        <BudgetRequestForm
          projectId={projectId}
          onClose={() => setShowRequestForm(false)}
          onSuccess={() => {
            setShowRequestForm(false);
            loadFinancials();
          }}
        />
      )}
    </div>
  );
}
