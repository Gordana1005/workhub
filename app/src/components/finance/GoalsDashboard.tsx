'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, TrendingUp, Calendar, DollarSign, Plus, Edit2, Trash2 } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import GoalBuilder from './GoalBuilder';

export default function GoalsDashboard() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalBuilder, setShowGoalBuilder] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finance_goals')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data) setGoals(data);
    setLoading(false);
  };

  const handleSaveGoal = async (goalData: any) => {
    try {
      if (editingGoal) {
        // Update existing goal
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
        // Create new goal
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

      setShowGoalBuilder(false);
      setEditingGoal(null);
      await loadGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Failed to save goal');
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
    if (!confirm('Are you sure you want to delete this goal?')) return;

    const { error } = await supabase
      .from('finance_goals')
      .delete()
      .eq('id', goalId);

    if (!error) {
      await loadGoals();
    }
  };

  if (showGoalBuilder) {
    return (
      <GoalBuilder
        onSave={handleSaveGoal}
        onCancel={() => { setShowGoalBuilder(false); setEditingGoal(null); }}
        initialData={editingGoal}
      />
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400">Loading goals...</p>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
        <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Financial Goals Yet</h3>
        <p className="text-slate-400 mb-6">
          Set financial goals to track your progress and stay motivated
        </p>
        <button
          onClick={() => setShowGoalBuilder(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Your First Goal
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Financial Goals</h2>
        <button
          onClick={() => setShowGoalBuilder(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map(goal => {
          const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
          const remaining = goal.target_amount - goal.current_amount;
          const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;
          const isComplete = progress >= 100;
          const isOverdue = daysLeft !== null && daysLeft < 0 && !isComplete;

          return (
            <div key={goal.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-1">{goal.name}</h3>
                  {goal.description && (
                    <p className="text-sm text-slate-400">{goal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isComplete
                      ? 'bg-green-500/10 text-green-500'
                      : progress >= 75
                      ? 'bg-blue-500/10 text-blue-500'
                      : isOverdue
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {progress.toFixed(0)}%
                  </div>
                  <button
                    onClick={() => { setEditingGoal(goal); setShowGoalBuilder(true); }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isComplete
                        ? 'bg-green-500'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-slate-400">
                    ${goal.current_amount.toLocaleString()}
                  </span>
                  <span className="text-slate-400">
                    ${goal.target_amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-slate-400">Remaining</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    ${Math.max(remaining, 0).toLocaleString()}
                  </div>
                </div>

                {daysLeft !== null && (
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-slate-400">
                        {daysLeft < 0 ? 'Overdue' : 'Days Left'}
                      </span>
                    </div>
                    <div className={`text-lg font-bold ${
                      daysLeft < 0 ? 'text-red-500' : 'text-white'
                    }`}>
                      {Math.abs(daysLeft)}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Add Progress */}
              {!isComplete && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Add amount"
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    onKeyPress={(e) => {
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
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      const amount = parseFloat(input.value);
                      if (amount > 0) {
                        updateGoalProgress(goal.id, goal.current_amount, amount);
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}

              {isComplete && (
                <div className="flex items-center justify-center gap-2 py-3 bg-green-500/10 text-green-500 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">Goal Achieved! 🎉</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
