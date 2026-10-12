'use client';

import { useState } from 'react';
import { Target } from 'lucide-react';
import { differenceInDays, differenceInWeeks, differenceInMonths, addDays, format } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';

interface GoalBuilderProps {
  onSave: (goal: any) => void;
  onCancel?: () => void;
  initialData?: any;
}

const fieldClass = 'block w-full min-w-0 max-w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none';

export default function GoalBuilder({ onSave, onCancel, initialData }: GoalBuilderProps) {
  const t = useTranslations('pages.tools');
  const { locale } = useLocaleSwitch();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const [mode, setMode] = useState<'target' | 'daily'>('target');
  const [goalData, setGoalData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    targetAmount: initialData?.target_amount || 0,
    currentAmount: initialData?.current_amount || 0,
    targetDate: initialData?.target_date || '',
    dailyIncome: 0,
  });

  const [forecast, setForecast] = useState<any>(null);

  const calculateForward = () => {
    if (!goalData.targetDate || !goalData.targetAmount) return;

    const target = goalData.targetAmount - goalData.currentAmount;
    const daysRemaining = differenceInDays(new Date(goalData.targetDate), new Date());
    const weeksRemaining = differenceInWeeks(new Date(goalData.targetDate), new Date());
    const monthsRemaining = differenceInMonths(new Date(goalData.targetDate), new Date());

    if (daysRemaining <= 0) {
      alert(t('finance.targetDateFuture'));
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
      alert(t('finance.goalFieldsRequired'));
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
    <div className="min-w-0 space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => { setMode('target'); setForecast(null); }}
          className={`rounded-lg px-3 py-2 text-sm font-medium leading-snug ${
            mode === 'target'
              ? 'bg-primary text-white'
              : 'border border-border bg-secondary text-text-secondary hover:bg-surface-hover'
          }`}
        >
          {t('finance.modeTarget')}
        </button>
        <button
          type="button"
          onClick={() => { setMode('daily'); setForecast(null); }}
          className={`rounded-lg px-3 py-2 text-sm font-medium leading-snug ${
            mode === 'daily'
              ? 'bg-primary text-white'
              : 'border border-border bg-secondary text-text-secondary hover:bg-surface-hover'
          }`}
        >
          {t('finance.modeDaily')}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="goal-name">
            {t('finance.goalName')} <span className="text-red-600">*</span>
          </label>
          <input
            id="goal-name"
            type="text"
            value={goalData.name}
            onChange={(e) => setGoalData({ ...goalData, name: e.target.value })}
            placeholder={t('finance.goalNamePlaceholder')}
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="goal-description">
            {t('finance.descriptionOptional')}
          </label>
          <textarea
            id="goal-description"
            value={goalData.description}
            onChange={(e) => setGoalData({ ...goalData, description: e.target.value })}
            placeholder={t('finance.goalDescriptionPlaceholder')}
            rows={2}
            className={`${fieldClass} resize-none`}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="goal-target">
            {t('finance.targetAmount')} <span className="text-red-600">*</span>
          </label>
          <input
            id="goal-target"
            type="number"
            step="0.01"
            value={goalData.targetAmount || ''}
            onChange={(e) => setGoalData({ ...goalData, targetAmount: parseFloat(e.target.value) || 0 })}
            placeholder="100000"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="goal-current">
            {t('finance.currentAmount')}
          </label>
          <input
            id="goal-current"
            type="number"
            step="0.01"
            value={goalData.currentAmount || ''}
            onChange={(e) => setGoalData({ ...goalData, currentAmount: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className={fieldClass}
          />
        </div>

        {mode === 'target' ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="goal-date">
              {t('finance.targetDate')} <span className="text-red-600">*</span>
            </label>
            <input
              id="goal-date"
              type="date"
              value={goalData.targetDate}
              onChange={(e) => setGoalData({ ...goalData, targetDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className={fieldClass}
            />
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary" htmlFor="goal-daily">
              {t('finance.dailyRate')} <span className="text-red-600">*</span>
            </label>
            <input
              id="goal-daily"
              type="number"
              step="0.01"
              value={goalData.dailyIncome || ''}
              onChange={(e) => setGoalData({ ...goalData, dailyIncome: parseFloat(e.target.value) || 0 })}
              placeholder="100"
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-text-secondary">{t('finance.dailyRateHint')}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleCalculate}
        disabled={
          !goalData.targetAmount ||
          (mode === 'target' && !goalData.targetDate) ||
          (mode === 'daily' && !goalData.dailyIncome)
        }
        className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t('finance.calculate')}
      </button>

      {forecast && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 shrink-0 text-primary" />
            <h4 className="text-base font-semibold text-text-primary">
              {t('finance.pathTo', { amount: `$${goalData.targetAmount.toLocaleString()}` })}
            </h4>
          </div>

          <dl className="mb-4 divide-y divide-border rounded-xl border border-border bg-surface text-sm">
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="text-text-secondary">{t('finance.perDay')}</dt>
              <dd className="font-semibold text-text-primary">${forecast.perDay.toFixed(2)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="text-text-secondary">{t('finance.perWeek')}</dt>
              <dd className="font-semibold text-text-primary">${forecast.perWeek.toFixed(2)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="text-text-secondary">{t('finance.perMonth')}</dt>
              <dd className="font-semibold text-text-primary">${forecast.perMonth.toFixed(2)}</dd>
            </div>
          </dl>

          {mode === 'target' ? (
            <div className="text-center">
              <div className="text-2xl font-semibold text-text-primary">
                {t('finance.daysCount', { count: forecast.daysRemaining })}
              </div>
              <div className="mt-1 text-sm text-text-secondary">
                {t('finance.untilDate', { date: format(new Date(goalData.targetDate), 'MMMM d, yyyy', { locale: dateLocale }) })}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-2xl font-semibold text-text-primary">
                {t('finance.daysCount', { count: forecast.daysNeeded })}
              </div>
              <div className="mt-1 text-sm text-text-secondary">
                {t('finance.goalReachedBy', { date: format(forecast.estimatedDate, 'MMMM d, yyyy', { locale: dateLocale }) })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-border bg-surface px-4 py-3 sm:flex-row">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-hover"
          >
            {t('finance.cancel')}
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!goalData.name || !goalData.targetAmount || !forecast}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('finance.saveGoal')}
        </button>
      </div>
    </div>
  );
}
