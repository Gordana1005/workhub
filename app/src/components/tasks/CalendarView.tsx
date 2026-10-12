'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarView.css';

const locales = {
  'en-US': enUS,
  mk,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Task {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
}

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onDateSelect?: (start: Date, end: Date) => void;
}

function priorityLabel(priority: string, t: (key: string) => string) {
  if (priority === 'low') return t('priorityLow');
  if (priority === 'medium') return t('priorityMedium');
  if (priority === 'high') return t('priorityHigh');
  if (priority === 'urgent') return t('priorityUrgent');
  return priority;
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === 'To Do') return t('statusToDo');
  if (status === 'In Progress') return t('statusInProgress');
  if (status === 'Review') return t('statusReview');
  if (status === 'Done') return t('statusDone');
  return status;
}

export default function CalendarView({ tasks, onTaskClick, onDateSelect }: CalendarViewProps) {
  const t = useTranslations('pages.tasks');
  const locale = useLocale();
  // Convert tasks to calendar events
  const events = tasks
    .filter(task => task.due_date)
    .map(task => ({
      id: task.id,
      title: task.title,
      start: new Date(task.due_date!),
      end: new Date(task.due_date!),
      resource: task,
    }));

  const eventStyleGetter = (event: any) => {
    const task = event.resource as Task;
    
    const priorityColors = {
      urgent: { bg: '#ef4444', border: '#dc2626' },
      high: { bg: '#f97316', border: '#ea580c' },
      medium: { bg: '#eab308', border: '#ca8a04' },
      low: { bg: '#22c55e', border: '#16a34a' },
    };

    const color = priorityColors[task.priority];

    return {
      style: {
        backgroundColor: color.bg,
        borderLeft: `4px solid ${color.border}`,
        borderRadius: '4px',
        opacity: task.status === 'Done' ? 0.6 : 1,
        color: task.priority === 'medium' ? '#1f2937' : 'white',
        border: 'none',
        padding: '2px 5px',
      },
    };
  };

  const handleSelectEvent = (event: any) => {
    if (onTaskClick) {
      onTaskClick(event.resource);
    }
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (onDateSelect) {
      onDateSelect(start, end);
    }
  };

  return (
    <div className="calendar-container">
      <Calendar
        localizer={localizer}
        culture={locale === 'mk' ? 'mk' : 'en-US'}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 560, width: '100%' }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        views={['month', 'week', 'day', 'agenda']}
        defaultView="month"
        popup
        messages={{
          date: t('calendarDate'),
          time: t('calendarTime'),
          event: t('calendarEvent'),
          allDay: t('calendarAllDay'),
          week: t('calendarWeek'),
          work_week: t('calendarWorkWeek'),
          day: t('calendarDay'),
          month: t('calendarMonth'),
          previous: t('calendarPrevious'),
          next: t('calendarNext'),
          yesterday: t('calendarYesterday'),
          tomorrow: t('calendarTomorrow'),
          today: t('calendarToday'),
          agenda: t('calendarAgenda'),
          noEventsInRange: t('calendarNoEvents'),
          showMore: (count: number) => t('calendarShowMore', { count }),
        }}
        tooltipAccessor={(event: any) => {
          const task = event.resource as Task;
          return `${task.title}\n${t('tooltipPriority', { value: priorityLabel(task.priority, t) })}\n${t('tooltipStatus', { value: statusLabel(task.status, t) })}`;
        }}
      />
    </div>
  );
}
