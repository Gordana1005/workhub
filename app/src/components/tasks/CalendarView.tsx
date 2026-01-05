'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarView.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
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

export default function CalendarView({ tasks, onTaskClick, onDateSelect }: CalendarViewProps) {
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
        color: 'white',
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
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        views={['month', 'week', 'day', 'agenda']}
        defaultView="month"
        popup
        tooltipAccessor={(event: any) => {
          const task = event.resource as Task;
          return `${task.title}\nPriority: ${task.priority}\nStatus: ${task.status}`;
        }}
      />
    </div>
  );
}
