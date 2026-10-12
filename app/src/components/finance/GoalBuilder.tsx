'use client';

import { useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import { differenceInDays, differenceInWeeks, differenceInMonths, addDays, format } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { useLocaleSwitch } from '@/i18n/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Segmented } from '@/components/tools/Segmented';
import { formatMoney } from './money';

interface GoalBuilderProps {
  onSave: (goal: any) => void;
  onCancel: () => void;
  initialData?: any;
  currency?: string;
}

const fieldClass =
  'block w-full min-w-0 max-w-full rounded-lg border border-border-control bg-secondary px-3 py-2.5 min-h-11 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:min-h-10 sm:text-sm';

export default function GoalBuilder({ onSave, onCancel, initialData, currency = 'USD' }: GoalBuilderProps) {
  const t = useTranslations('pages.tools');
  const { locale } = useLocaleSwitch();
  const dateLocale = locale === 'mk' ? mk : enUS;
  const [mode, setMode] = useState<'target' | 'daily'>('target');
  const [error, setError] = useState<string | null>(null);
  const [goalData, setGoalData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    targetAmount: Number(initialData?.target_amount) || 0,
    currentAmount: Number(initialData?.current_amount) || 0,
    targetDate: initialData?.target_date || '',
    dailyIncome: 0,
  });

  // The forecast is derived live, so there is no separate "calculate" step.
  const forecast = useMemo(() => {
    const remaining = goalData.targetAmount - goalData.currentAmount;
    if (!goalData.targetAmount || remaining <= 0) return null;

    if (mode === 'target') {
      if (!goalData.targetDate) return null;
      const target = new Date(goalData.targetDate);
      const days = differenceInDays(target, new Date());
      if (days <= 0) return null;
      return {
        days,
        until: target,
        perDay: remaining / days,
        perWeek: remaining / Math.max(differenceInWeeks(target, new Date()), 1),
        perMonth: remaining / Math.max(differenceInMonths(target, new Date()), 1),
      };
    }

    if (!goalData.dailyIncome) return null;
    const days = Math.ceil(remaining / goalData.dailyIncome);
    return {
      days,
      until: addDays(new Date(), days),
      perDay: goalData.dailyIncome,
      perWeek: goalData.dailyIncome * 7,
      perMonth: goalData.dailyIncome * 30,
    };
  }, [mode, goalData]);

  const pastDate =
    mode === 'target' && goalData.targetDate && differenceInDays(new Date(goalData.targetDate), new Date()) <= 0;

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!goalData.name.trim() || !goalData.targetAmount) {
      setError(t('finance.goalFieldsRequired'));
      return;
    }
    if (pastDate) {
      setError(t('finance.targetDateFuture'));
      return;
    }

    onSave({
      name: goalData.name.trim(),
      description: goalData.description,
      target_amount: goalData.targetAmount,
      current_amount: goalData.currentAmount,
      target_date: mode === 'target' ? goalData.targetDate || null : initialData?.target_date || null,
    });
  };

  const labelClass = 'mb-1.5 block text-sm font-medium text-text-secondary';

  return (
    <Dialog
      open
      size="lg"
      title={initialData ? t('finance.editGoal') : t('finance.goalCalculator')}
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="secondary" className="h-11 sm:h-10" onClick={onCancel}>
            {t('finance.cancel')}
          </Button>
          <Button type="submit" form="goal-form" className="h-12 sm:h-10" disabled={!goalData.name.trim() || !goalData.targetAmount}>
            {t('finance.saveGoal')}
          </Button>
        </>
      }
    >
      <form id="goal-form" onSubmit={handleSave} className="min-w-0 space-y-4">
        <Segmented
          fullWidth
          large
          label={t('finance.goalCalculator')}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError(null);
          }}
          options={[
            { value: 'target', label: t('finance.modeTarget') },
            { value: 'daily', label: t('finance.modeDaily') },
          ]}
        />

        <div>
          <label className={labelClass} htmlFor="goal-name">
            {t('finance.goalName')} <span className="text-danger">*</span>
          </label>
          <input
            id="goal-name"
            type="text"
            autoFocus
            enterKeyHint="next"
            value={goalData.name}
            onChange={(e) => setGoalData({ ...goalData, name: e.target.value })}
            placeholder={t('finance.goalNamePlaceholder')}
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="goal-description">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="goal-target">
              {t('finance.targetAmount')} <span className="text-danger">*</span>
            </label>
            <input
              id="goal-target"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={goalData.targetAmount || ''}
              onChange={(e) => setGoalData({ ...goalData, targetAmount: parseFloat(e.target.value) || 0 })}
              placeholder="100000"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="goal-current">
              {t('finance.currentAmount')}
            </label>
            <input
              id="goal-current"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={goalData.currentAmount || ''}
              onChange={(e) => setGoalData({ ...goalData, currentAmount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className={fieldClass}
            />
          </div>
        </div>

        {mode === 'target' ? (
          <div>
            <label className={labelClass} htmlFor="goal-date">
              {t('finance.targetDate')}
            </label>
            <input
              id="goal-date"
              type="date"
              value={goalData.targetDate}
              onChange={(e) => setGoalData({ ...goalData, targetDate: e.target.value })}
              min={format(new Date(), 'yyyy-MM-dd')}
              className={fieldClass}
            />
          </div>
        ) : (
          <div>
            <label className={labelClass} htmlFor="goal-daily">
              {t('finance.dailyRate')}
            </label>
            <input
              id="goal-daily"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={goalData.dailyIncome || ''}
              onChange={(e) => setGoalData({ ...goalData, dailyIncome: parseFloat(e.target.value) || 0 })}
              placeholder="100"
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-text-muted">{t('finance.dailyRateHint')}</p>
          </div>
        )}

        {forecast ? (
          <div className="rounded-xl border border-border bg-surface-hover p-4" aria-live="polite">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 shrink-0 text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">
                {t('finance.pathTo', { amount: formatMoney(goalData.targetAmount, currency, locale) })}
              </h3>
            </div>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:text-center">
              {[
                { label: t('finance.perDay'), value: forecast.perDay },
                { label: t('finance.perWeek'), value: forecast.perWeek },
                { label: t('finance.perMonth'), value: forecast.perMonth },
              ].map((item) => (
                <div key={item.label} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2 sm:block sm:px-2">
                  <dt className="truncate text-xs text-text-secondary">{item.label}</dt>
                  <dd className="truncate text-sm font-semibold tabular-nums text-text-primary sm:mt-0.5">
                    {formatMoney(item.value, currency, locale)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{t('finance.daysCount', { count: forecast.days })}</span>
              {' · '}
              {mode === 'target'
                ? t('finance.untilDate', { date: format(forecast.until, 'PP', { locale: dateLocale }) })
                : t('finance.goalReachedBy', { date: format(forecast.until, 'PP', { locale: dateLocale }) })}
            </p>
          </div>
        ) : null}

        {pastDate || error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {pastDate ? t('finance.targetDateFuture') : error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
