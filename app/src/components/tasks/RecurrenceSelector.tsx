'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Repeat } from 'lucide-react';

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  endDate?: Date | null;
  weekDays?: number[]; // 0-6, Sunday-Saturday
  monthDay?: number; // 1-31
}

interface RecurrenceSelectorProps {
  value?: RecurrencePattern | null;
  onChange: (pattern: RecurrencePattern | null) => void;
}

const weekdayKeys = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'];

export default function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const t = useTranslations('pages.tasks');
  const locale = useLocale();
  const [isEnabled, setIsEnabled] = useState(!!value);
  const [pattern, setPattern] = useState<RecurrencePattern>(
    value || {
      type: 'daily',
      interval: 1,
      endDate: null,
    }
  );

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      onChange(null);
    } else {
      onChange(pattern);
    }
  };

  const updatePattern = (updates: Partial<RecurrencePattern>) => {
    const newPattern = { ...pattern, ...updates };
    setPattern(newPattern);
    if (isEnabled) {
      onChange(newPattern);
    }
  };

  const toggleWeekDay = (day: number) => {
    const weekDays = pattern.weekDays || [];
    const newWeekDays = weekDays.includes(day)
      ? weekDays.filter(d => d !== day)
      : [...weekDays, day].sort();
    updatePattern({ weekDays: newWeekDays });
  };

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Repeat className="w-4 h-4 text-primary" />
          {t('recurringTask')}
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          aria-label={t('recurringTask')}
          onClick={() => handleToggle(!isEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-primary' : 'bg-text-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {isEnabled && (
        <div className="space-y-4 p-4 bg-tertiary rounded-lg border border-border">
          {/* Recurrence Type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{t('repeat')}</label>
            <select
              value={pattern.type}
              onChange={(e) => updatePattern({ type: e.target.value as any })}
              className="w-full px-3 py-2 bg-surface rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="daily">{t('repeatDaily')}</option>
              <option value="weekly">{t('repeatWeekly')}</option>
              <option value="monthly">{t('repeatMonthly')}</option>
              <option value="yearly">{t('repeatYearly')}</option>
              <option value="custom">{t('repeatCustom')}</option>
            </select>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {pattern.type === 'daily' && t('everyDays', { count: pattern.interval })}
              {pattern.type === 'weekly' && t('everyWeeks', { count: pattern.interval })}
              {pattern.type === 'monthly' && t('everyMonths', { count: pattern.interval })}
              {pattern.type === 'yearly' && t('everyYears', { count: pattern.interval })}
              {pattern.type === 'custom' && t('everyCustom', { count: pattern.interval })}
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={pattern.interval}
              onChange={(e) => updatePattern({ interval: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 bg-surface rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none"
            />
          </div>

          {/* Weekly: Select Days */}
          {pattern.type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">{t('repeatOn')}</label>
              <div className="flex gap-1 sm:gap-2">
                {weekdayKeys.map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleWeekDay(idx)}
                    className={`min-w-0 flex-1 px-1 py-2 text-xs sm:px-3 sm:text-sm rounded-lg border transition-colors ${
                      pattern.weekDays?.includes(idx)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-text-primary hover:border-primary'
                    }`}
                  >
                    {t(day)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly: Select Day of Month */}
          {pattern.type === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">{t('dayOfMonth')}</label>
              <input
                type="number"
                min="1"
                max="31"
                value={pattern.monthDay || 1}
                onChange={(e) => updatePattern({ monthDay: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-surface rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none"
              />
            </div>
          )}

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">{t('endDateOptional')}</label>
            <input
              type="date"
              value={pattern.endDate ? new Date(pattern.endDate).toISOString().split('T')[0] : ''}
              onChange={(e) =>
                updatePattern({ endDate: e.target.value ? new Date(e.target.value) : null })
              }
              className="w-full px-3 py-2 bg-surface rounded-lg border border-border text-text-primary focus:border-primary focus:outline-none"
            />
          </div>

          {/* Summary */}
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-text-secondary">
              {getRecurrenceSummary(pattern, t, locale)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getRecurrenceSummary(
  pattern: RecurrencePattern,
  t: (key: string, values?: Record<string, string | number>) => string,
  locale: string
): string {
  let when: string;

  if (pattern.interval === 1) {
    if (pattern.type === 'daily') when = t('summaryDaily');
    else if (pattern.type === 'weekly') when = t('summaryWeekly');
    else if (pattern.type === 'monthly') when = t('summaryMonthly');
    else if (pattern.type === 'yearly') when = t('summaryYearly');
    else when = t('summaryCustom');
  } else if (pattern.type === 'daily') {
    when = t('summaryEveryDays', { count: pattern.interval });
  } else if (pattern.type === 'weekly') {
    when = t('summaryEveryWeeks', { count: pattern.interval });
  } else if (pattern.type === 'monthly') {
    when = t('summaryEveryMonths', { count: pattern.interval });
  } else if (pattern.type === 'yearly') {
    when = t('summaryEveryYears', { count: pattern.interval });
  } else {
    when = t('summaryEveryCustom', { count: pattern.interval });
  }

  let summary = t('summaryBase', { when });

  if (pattern.type === 'weekly' && pattern.weekDays && pattern.weekDays.length > 0) {
    const days = pattern.weekDays.map(d => t(weekdayKeys[d])).join(', ');
    summary += t('summaryOnDays', { days });
  }

  if (pattern.type === 'monthly' && pattern.monthDay) {
    summary += t('summaryOnDay', { day: pattern.monthDay });
  }

  if (pattern.endDate) {
    summary += t('summaryUntil', {
      date: new Date(pattern.endDate).toLocaleDateString(locale === 'mk' ? 'mk' : 'en-US'),
    });
  }

  return summary;
}
