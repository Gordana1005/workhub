'use client';

import { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import { dayKey, isDone, parseDayKey, priorityLabel, statusLabel } from './taskUtils';
import type { Task } from './types';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarView.css';

const locales = {
  'en-US': enUS,
  mk,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  // Weeks start on Monday for both supported languages
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onDateSelect?: (start: Date, end: Date) => void;
}

/** Month calendar of tasks by due date. Fills the height of its parent from lg up. */
export default function CalendarView({ tasks, onTaskClick, onDateSelect }: CalendarViewProps) {
  const t = useTranslations('pages.tasks');
  const locale = useLocale();
  const [date, setDate] = useState(() => new Date());

  const events = tasks.flatMap((task) => {
    const key = dayKey(task.due_date);
    if (!key) return [];
    const day = parseDayKey(key);
    return [{ id: task.id, title: task.title, start: day, end: day, allDay: true, resource: task }];
  });

  const eventPropGetter = (event: { resource: Task }) => {
    const task = event.resource;
    return {
      className: `tw-ev-${task.priority || 'medium'}${isDone(task) ? ' tw-ev-done' : ''}`,
    };
  };

  return (
    <div className="calendar-container">
      <Calendar
        localizer={localizer}
        culture={locale === 'mk' ? 'mk' : 'en-US'}
        events={events}
        startAccessor="start"
        endAccessor="end"
        allDayAccessor="allDay"
        date={date}
        onNavigate={setDate}
        view="month"
        onView={() => {}}
        views={['month']}
        eventPropGetter={eventPropGetter}
        onSelectEvent={(event) => onTaskClick?.(event.resource)}
        onSelectSlot={({ start, end }) => onDateSelect?.(start, end)}
        selectable
        popup
        messages={{
          month: t('calendarMonth'),
          previous: t('calendarPrevious'),
          next: t('calendarNext'),
          today: t('calendarToday'),
          noEventsInRange: t('calendarNoEvents'),
          showMore: (count: number) => t('calendarShowMore', { count }),
        }}
        tooltipAccessor={(event) => {
          const task = event.resource;
          return `${task.title}\n${t('tooltipPriority', { value: priorityLabel(t, task.priority) })}\n${t('tooltipStatus', { value: statusLabel(t, task.status) })}`;
        }}
      />
    </div>
  );
}
