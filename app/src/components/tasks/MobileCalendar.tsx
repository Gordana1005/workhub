'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { addDays, addMonths, startOfMonth, startOfWeek } from 'date-fns'
import { PRIORITY_TONE, dayKey, isDone, parseDayKey, todayKey, toDayKey } from './taskUtils'
import type { Task } from './types'

/**
 * Phone calendar: a compact month grid (100% width, dots for tasks) with an agenda list for the
 * selected day underneath. react-big-calendar is not used here, so it is never downloaded on phones.
 */
export default function MobileCalendar({
  tasks,
  renderTask,
  onAddForDay,
}: {
  tasks: Task[]
  renderTask: (task: Task) => ReactNode
  /** day key (YYYY-MM-DD) to create a task for */
  onAddForDay: (key: string) => void
}) {
  const t = useTranslations('pages.tasks')
  const format = useFormatter()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => todayKey())
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      const key = dayKey(task.due_date)
      if (!key) continue
      map.set(key, [...(map.get(key) || []), task])
    }
    return map
  }, [tasks])

  const gridStart = startOfWeek(month, { weekStartsOn: 1 })
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  // drop a trailing week that is entirely next month
  const weeks = days[35].getMonth() === month.getMonth() ? 6 : 5
  const visibleDays = days.slice(0, weeks * 7)
  const today = todayKey()

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    format.dateTime(addDays(new Date(2024, 0, 1), i), { weekday: 'short' })
  )

  const move = (delta: number) => setMonth((current) => addMonths(current, delta))
  const goToday = () => {
    setMonth(startOfMonth(new Date()))
    setSelected(todayKey())
  }

  const agenda = byDay.get(selected) || []
  const selectedDate = parseDayKey(selected)

  const navButton =
    'inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-2">
        <div className="flex items-center gap-1">
          <h2 className="min-w-0 flex-1 truncate px-2 text-base font-semibold capitalize text-text-primary" aria-live="polite">
            {format.dateTime(month, { month: 'long', year: 'numeric' })}
          </h2>
          <button
            type="button"
            onClick={goToday}
            className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium text-primary transition-colors active:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('calendarToday')}
          </button>
          <button type="button" onClick={() => move(-1)} aria-label={t('calendarPrevious')} className={navButton}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label={t('calendarNext')} className={navButton}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-1 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-text-muted" aria-hidden>
          {weekdays.map((label, index) => (
            <span key={index} className="truncate py-1">
              {label}
            </span>
          ))}
        </div>

        <div
          className="grid grid-cols-7 gap-y-0.5"
          style={{ touchAction: 'pan-y' }}
          onTouchStart={(event) => {
            const touch = event.touches[0]
            touchStart.current = { x: touch.clientX, y: touch.clientY }
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current
            touchStart.current = null
            if (!start) return
            const touch = event.changedTouches[0]
            const dx = touch.clientX - start.x
            const dy = touch.clientY - start.y
            if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1)
          }}
        >
          {visibleDays.map((date) => {
            const key = toDayKey(date)
            const items = byDay.get(key) || []
            const inMonth = date.getMonth() === month.getMonth()
            const isSelected = key === selected
            const isToday = key === today
            const open = items.filter((task) => !isDone(task))
            const label = format.dateTime(date, { weekday: 'long', month: 'long', day: 'numeric' })
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                aria-current={isToday ? 'date' : undefined}
                aria-label={items.length ? `${label}, ${t('tasksOnDay', { count: items.length })}` : label}
                onClick={() => {
                  setSelected(key)
                  if (!inMonth) setMonth(startOfMonth(date))
                }}
                className={`relative mx-auto flex h-11 w-full max-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? 'bg-primary font-semibold text-white'
                    : isToday
                      ? 'bg-primary/10 font-semibold text-primary active:bg-primary/20'
                      : inMonth
                        ? 'text-text-primary active:bg-tertiary'
                        : 'text-text-muted active:bg-tertiary'
                }`}
              >
                <span className="leading-none">{date.getDate()}</span>
                <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
                  {open.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : PRIORITY_TONE[task.priority]?.dot || 'bg-primary'}`}
                    />
                  ))}
                  {open.length === 0 && items.length > 0 ? (
                    <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-border-strong'}`} />
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <section aria-label={format.dateTime(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold capitalize text-text-primary">
            {selected === today ? `${t('today')} · ` : ''}
            {format.dateTime(selectedDate, { weekday: 'long', month: 'short', day: 'numeric' })}
            <span className="ml-2 font-normal tabular-nums text-text-muted">{agenda.length}</span>
          </h3>
          <button
            type="button"
            onClick={() => onAddForDay(selected)}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-primary transition-colors active:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="h-4 w-4" />
            {t('newTask')}
          </button>
        </div>
        {agenda.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-text-secondary">
            {t('noTasksThisDay')}
          </p>
        ) : (
          <div className="space-y-2">{agenda.map((task) => <div key={task.id}>{renderTask(task)}</div>)}</div>
        )}
      </section>
    </div>
  )
}
