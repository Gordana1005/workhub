'use client';

import { useState } from 'react';
import { Target, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { differenceInDays, differenceInWeeks, differenceInMonths, addDays, format } from 'date-fns';

interface GoalBuilderProps {
  onSave: (goal: any) => void;
  onCancel?: () => void;
  initialData?: any;
}

export default function GoalBuilder({ onSave, onCancel, initialData }: GoalBuilderProps) {
  const [mode, setMode] = useState<'target' | 'daily'>('target');
  const [goalData, setGoalData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    targetAmount: initialData?.target_amount || 0,
    currentAmount: initialData?.current_amount || 0,
    targetDate: initialData?.target_date || '',
    dailyIncome: 0, // For reverse calculation
  });

  const [forecast, setForecast] = useState<any>(null);

  const calculateForward = () => {
    // Calculate how much per day/week/month needed to hit target
    if (!goalData.targetDate || !goalData.targetAmount) return;

    const target = goalData.targetAmount - goalData.currentAmount;
    const daysRemaining = differenceInDays(new Date(goalData.targetDate), new Date());
    const weeksRemaining = differenceInWeeks(new Date(goalData.targetDate), new Date());
    const monthsRemaining = differenceInMonths(new Date(goalData.targetDate), new Date());

    if (daysRemaining <= 0) {
      alert('Target date must be in the future');
      return;
    }

    setForecast({
      target,
      daysRemaining,
      perDay: target / daysRemaining,
      perWeek: target / Math.max(weeksRemaining, 1),
      perMonth: target / Math.max(monthsRemaining, 1),
    });
  };

  const calculateBackward = () => {
    // Calculate how long to hit target at current daily rate
    if (!goalData.dailyIncome || !goalData.targetAmount) return;

    const target = goalData.targetAmount - goalData.currentAmount;
    const daysNeeded = Math.ceil(target / goalData.dailyIncome);
    const estimatedDate = addDays(new Date(), daysNeeded);

    setForecast({
      target,
      daysNeeded,
      estimatedDate,
      perDay: goalData.dailyIncome,
      perWeek: goalData.dailyIncome * 7,
      perMonth: goalData.dailyIncome * 30,
    });
  };

  const handleCalculate = () => {
    if (mode === 'target') {
      calculateForward();
    } else {
      calculateBackward();
    }
  };

  const handleSave = () => {
    if (!goalData.name || !goalData.targetAmount) {
      alert('Please provide goal name and target amount');
      return;
    }

    onSave({
      name: goalData.name,
      description: goalData.description,
      target_amount: goalData.targetAmount,
      current_amount: goalData.currentAmount,
      target_date: goalData.targetDate || null,
      ...forecast,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-xl font-semibold text-white mb-6">Financial Goal Calculator</h3>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setMode('target'); setForecast(null); }}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            mode === 'target'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Target Amount & Date
        </button>
        <button
          onClick={() => { setMode('daily'); setForecast(null); }}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            mode === 'daily'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Daily Income Rate
        </button>
      </div>

      {/* Common Fields */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Goal Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={goalData.name}
            onChange={(e) => setGoalData({ ...goalData, name: e.target.value })}
            placeholder="e.g., Save for vacation"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={goalData.description}
            onChange={(e) => setGoalData({ ...goalData, description: e.target.value })}
            placeholder="Add details about your goal..."
            rows={2}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Target Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="number"
              step="0.01"
              value={goalData.targetAmount || ''}
              onChange={(e) => setGoalData({ ...goalData, targetAmount: parseFloat(e.target.value) || 0 })}
              placeholder="100000"
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Current Amount
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="number"
              step="0.01"
              value={goalData.currentAmount || ''}
              onChange={(e) => setGoalData({ ...goalData, currentAmount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
            />
          </div>
        </div>
      </div>

      {/* Mode-Specific Fields */}
      {mode === 'target' ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Target Date <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="date"
              value={goalData.targetDate}
              onChange={(e) => setGoalData({ ...goalData, targetDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
            />
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Daily Income/Savings Rate <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="number"
              step="0.01"
              value={goalData.dailyIncome || ''}
              onChange={(e) => setGoalData({ ...goalData, dailyIncome: parseFloat(e.target.value) || 0 })}
              placeholder="100"
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            How much can you save or earn per day?
          </p>
        </div>
      )}

      <button
        onClick={handleCalculate}
        disabled={
          !goalData.targetAmount || 
          (mode === 'target' && !goalData.targetDate) ||
          (mode === 'daily' && !goalData.dailyIncome)
        }
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium mb-6 transition-colors"
      >
        Calculate
      </button>

      {/* Forecast Results */}
      {forecast && (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-500" />
            <h4 className="text-lg font-semibold text-white">Your Path to ${goalData.targetAmount.toLocaleString()}</h4>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-1">Per Day</div>
              <div className="text-2xl font-bold text-white">
                ${forecast.perDay.toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-1">Per Week</div>
              <div className="text-2xl font-bold text-white">
                ${forecast.perWeek.toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-1">Per Month</div>
              <div className="text-2xl font-bold text-white">
                ${forecast.perMonth.toFixed(2)}
              </div>
            </div>
          </div>

          {mode === 'target' ? (
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {forecast.daysRemaining} days
              </div>
              <div className="text-slate-400">
                until {format(new Date(goalData.targetDate), 'MMMM d, yyyy')}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {forecast.daysNeeded} days
              </div>
              <div className="text-slate-400">
                Goal reached by {format(forecast.estimatedDate, 'MMMM d, yyyy')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!goalData.name || !goalData.targetAmount || !forecast}
          className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
        >
          Save Goal
        </button>
      </div>
    </div>
  );
}
