'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Clock, AlertTriangle, Edit2, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
}

export default function ProjectBudgetCard({ projectId }: ProjectBudgetCardProps) {
  const [financials, setFinancials] = useState<ProjectFinancials | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    budget: '',
    hourly_rate: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancials();
  }, [projectId]);

  const loadFinancials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_financials')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (data) {
      setFinancials(data);
      setBudgetForm({
        budget: data.budget?.toString() || '',
        hourly_rate: data.hourly_rate?.toString() || '',
      });
    }
    setLoading(false);
  };

  const handleSaveBudget = async () => {
    const { error } = await supabase
      .from('projects')
      .update({
        budget: budgetForm.budget ? parseFloat(budgetForm.budget) : null,
        hourly_rate: budgetForm.hourly_rate ? parseFloat(budgetForm.hourly_rate) : null,
      })
      .eq('id', projectId);

    if (!error) {
      setIsEditing(false);
      await loadFinancials();
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
          <div className="h-24 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!financials) return null;

  const hasBudget = financials.budget && financials.budget > 0;
  const budgetPercentage = hasBudget ? Math.min(financials.budget_used_percentage, 100) : 0;
  const isOverBudget = hasBudget && financials.budget_used_percentage > 100;
  const isNearLimit = hasBudget && financials.budget_used_percentage > 80;

  // Show setup form if no budget configured
  if (!hasBudget && !isEditing) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Project Budget</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            Set Budget
          </button>
        </div>
        <p className="text-slate-400 text-sm">
          Track expenses, income, and profitability for this project by setting a budget.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Project Budget</h3>
        <div className="flex items-center gap-2">
          {isOverBudget && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-sm">
              <AlertTriangle className="w-4 h-4" />
              Over Budget
            </div>
          )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveBudget}
                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setBudgetForm({
                    budget: financials.budget?.toString() || '',
                    hourly_rate: financials.hourly_rate?.toString() || '',
                  });
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Project Budget ({financials.budget_currency})
            </label>
            <input
              type="number"
              step="0.01"
              value={budgetForm.budget}
              onChange={(e) => setBudgetForm({ ...budgetForm, budget: e.target.value })}
              placeholder="10000.00"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Hourly Rate ({financials.budget_currency}) - Optional
            </label>
            <input
              type="number"
              step="0.01"
              value={budgetForm.hourly_rate}
              onChange={(e) => setBudgetForm({ ...budgetForm, hourly_rate: e.target.value })}
              placeholder="75.00"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
            <p className="mt-1 text-xs text-slate-500">
              Used to calculate billable amount from tracked hours
            </p>
          </div>
        </div>
      ) : (
        <>
          {hasBudget && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Budget Used</span>
                <span className="text-sm font-medium text-white">
                  ${financials.total_expenses.toLocaleString()} / ${financials.budget?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isOverBudget
                      ? 'bg-red-500'
                      : isNearLimit
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-500 text-right">
                {budgetPercentage.toFixed(1)}% used
              </div>
            </div>
          )}

          {/* Financial Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-slate-400">Remaining</span>
              </div>
              <div className={`text-2xl font-bold ${
                financials.remaining_budget < 0 ? 'text-red-500' : 'text-white'
              }`}>
                ${Math.abs(financials.remaining_budget).toLocaleString()}
              </div>
              {hasBudget && (
                <div className="text-xs text-slate-500 mt-1">
                  {financials.transaction_count} transaction{financials.transaction_count !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-slate-400">Income</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${financials.total_income.toLocaleString()}
              </div>
            </div>

            {financials.hourly_rate && financials.hourly_rate > 0 && (
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-slate-400">Billable Hours</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {financials.total_hours.toFixed(1)}h
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  ${financials.billable_amount.toLocaleString()} value @ ${financials.hourly_rate}/hr
                </div>
              </div>
            )}

            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {financials.profit >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm text-slate-400">Profit/Loss</span>
              </div>
              <div className={`text-2xl font-bold ${
                financials.profit >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {financials.profit >= 0 ? '+' : '-'}${Math.abs(financials.profit).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = `/dashboard/finance?project=${projectId}&type=expense`}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
            >
              Add Expense
            </button>
            <button
              onClick={() => window.location.href = `/dashboard/finance?project=${projectId}&type=income`}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Add Income
            </button>
          </div>
        </>
      )}
    </div>
  );
}
