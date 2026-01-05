'use client';

import { useState } from 'react';
import { Repeat, X } from 'lucide-react';

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

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
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
        <label className="flex items-center gap-2 text-sm font-medium">
          <Repeat className="w-4 h-4 text-purple-400" />
          Recurring Task
        </label>
        <button
          type="button"
          onClick={() => handleToggle(!isEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-purple-600' : 'bg-gray-600'
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
        <div className="space-y-4 p-4 bg-surface-light rounded-lg border border-white/10">
          {/* Recurrence Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Repeat</label>
            <select
              value={pattern.type}
              onChange={(e) => updatePattern({ type: e.target.value as any })}
              className="w-full px-3 py-2 bg-surface rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Every {pattern.interval} {pattern.type === 'daily' && 'day(s)'}
              {pattern.type === 'weekly' && 'week(s)'}
              {pattern.type === 'monthly' && 'month(s)'}
              {pattern.type === 'yearly' && 'year(s)'}
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={pattern.interval}
              onChange={(e) => updatePattern({ interval: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 bg-surface rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Weekly: Select Days */}
          {pattern.type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium mb-2">Repeat on</label>
              <div className="flex gap-2">
                {weekDays.map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleWeekDay(idx)}
                    className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                      pattern.weekDays?.includes(idx)
                        ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly: Select Day of Month */}
          {pattern.type === 'monthly' && (
            <div>
              <label className="block text-sm font-medium mb-2">Day of month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={pattern.monthDay || 1}
                onChange={(e) => updatePattern({ monthDay: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-surface rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
              />
            </div>
          )}

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium mb-2">End date (optional)</label>
            <input
              type="date"
              value={pattern.endDate ? new Date(pattern.endDate).toISOString().split('T')[0] : ''}
              onChange={(e) =>
                updatePattern({ endDate: e.target.value ? new Date(e.target.value) : null })
              }
              className="w-full px-3 py-2 bg-surface rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Summary */}
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-sm text-gray-300">
              {getRecurrenceSummary(pattern)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getRecurrenceSummary(pattern: RecurrencePattern): string {
  let summary = 'Repeats ';

  if (pattern.interval === 1) {
    summary += pattern.type;
  } else {
    summary += `every ${pattern.interval} `;
    if (pattern.type === 'daily') summary += 'days';
    else if (pattern.type === 'weekly') summary += 'weeks';
    else if (pattern.type === 'monthly') summary += 'months';
    else if (pattern.type === 'yearly') summary += 'years';
  }

  if (pattern.type === 'weekly' && pattern.weekDays && pattern.weekDays.length > 0) {
    const days = pattern.weekDays.map(d => weekDays[d]).join(', ');
    summary += ` on ${days}`;
  }

  if (pattern.type === 'monthly' && pattern.monthDay) {
    summary += ` on day ${pattern.monthDay}`;
  }

  if (pattern.endDate) {
    summary += ` until ${new Date(pattern.endDate).toLocaleDateString()}`;
  }

  return summary;
}
