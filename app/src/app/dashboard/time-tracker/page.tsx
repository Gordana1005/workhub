'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { ChevronLeft, ChevronRight, Pause, Play, Plus, Square, Trash2 } from 'lucide-react'
import { addDays, addWeeks, format, isSameDay, startOfWeek, subDays } from 'date-fns'
import { enUS, mk } from 'date-fns/locale'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { TaskPicker } from '@/components/tools/TaskPicker'

interface Task {
  id: string
  title: string
  project?: { name: string }
}

interface TimeEntry {
  id: string
  task_id: string | null
  project_id: string | null
  description: string
  duration: number
  date: string
  task?: { title: string; project?: { name: string } | null } | null
}

interface SavedTimer {
  workspaceId: string
  taskId: string
  description: string
  accumulated: number
  startedAt: number | null
}

const LEGACY_DESCRIPTION = 'Time tracking'
const TIMER_KEY = 'trackwork-timer'
const CHART_MIN_SCALE = 8 * 3600

const fieldClass =
  'w-full max-w-full rounded-lg border border-border bg-secondary min-h-11 px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:min-h-10 sm:text-sm'

const ymd = (date: Date) => format(date, 'yyyy-MM-dd')
const weekStartOf = (date: Date) => startOfWeek(date, { weekStartsOn: 1 })

export default function TimeTrackerPage() {
  const t = useTranslations('pages.tools')
  const { confirm, dialog: confirmDialog } = useConfirm()
  const locale = useLocale()
  const dateLocale = locale === 'mk' ? mk : enUS
  const { currentWorkspace } = useWorkspaceStore()
  const workspaceId = currentWorkspace?.id

  // Timer. Elapsed time is derived from timestamps so it survives tab throttling and reloads.
  const [accumulated, setAccumulated] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [currentTaskId, setCurrentTaskId] = useState('')
  const [currentDescription, setCurrentDescription] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [tasks, setTasks] = useState<Task[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => weekStartOf(new Date()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ entry: TimeEntry | null } | null>(null)
  const loadId = useRef(0)

  const running = startedAt !== null
  const seconds = accumulated + (startedAt !== null ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0)

  useEffect(() => {
    if (startedAt === null) return
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  // Restore a timer that was running when the page was left or reloaded.
  useEffect(() => {
    if (!workspaceId) return
    try {
      const raw = window.localStorage.getItem(TIMER_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as SavedTimer
        if (saved.workspaceId === workspaceId) {
          setAccumulated(Number(saved.accumulated) || 0)
          setStartedAt(typeof saved.startedAt === 'number' ? saved.startedAt : null)
          setCurrentTaskId(saved.taskId || '')
          setCurrentDescription(saved.description || '')
        }
      }
    } catch {
      // storage unavailable or corrupt; start fresh
    }
    setHydrated(true)
  }, [workspaceId])

  useEffect(() => {
    if (!hydrated || !workspaceId) return
    try {
      if (!startedAt && accumulated === 0 && !currentTaskId && !currentDescription) {
        window.localStorage.removeItem(TIMER_KEY)
      } else {
        const payload: SavedTimer = {
          workspaceId,
          taskId: currentTaskId,
          description: currentDescription,
          accumulated,
          startedAt,
        }
        window.localStorage.setItem(TIMER_KEY, JSON.stringify(payload))
      }
    } catch {
      // ignore storage errors
    }
  }, [hydrated, workspaceId, accumulated, startedAt, currentTaskId, currentDescription])

  const loadTasks = useCallback(async () => {
    if (!workspaceId) return
    try {
      const res = await fetch(`/api/tasks?workspace_id=${workspaceId}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setTasks(
          data
            .filter((task: { is_completed?: boolean }) => !task.is_completed)
            .map((task: { id: string; title: string; projects?: { name: string } | null }) => ({
              id: task.id,
              title: task.title,
              project: task.projects ? { name: task.projects.name } : undefined,
            }))
        )
      }
    } catch (loadError) {
      console.error('Error loading tasks:', loadError)
    }
  }, [workspaceId])

  const loadEntries = useCallback(async () => {
    if (!workspaceId) return
    const id = ++loadId.current
    try {
      const start = ymd(weekStart)
      const end = ymd(addDays(weekStart, 6))
      const res = await fetch(`/api/time-entries?workspace_id=${workspaceId}&start_date=${start}&end_date=${end}`)
      const data = await res.json()
      if (id === loadId.current) setEntries(Array.isArray(data.timeEntries) ? data.timeEntries : [])
    } catch (loadError) {
      console.error('Error loading time entries:', loadError)
    } finally {
      if (id === loadId.current) setLoading(false)
    }
  }, [workspaceId, weekStart])

  useEffect(() => {
    if (workspaceId) loadTasks()
  }, [workspaceId, loadTasks])

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)
      return
    }
    setLoading(true)
    loadEntries()
  }, [workspaceId, loadEntries])

  const startTimer = () => {
    setError('')
    setNow(Date.now())
    setStartedAt(Date.now())
  }

  const pauseTimer = () => {
    setAccumulated(seconds)
    setStartedAt(null)
  }

  const resetTimer = () => {
    setStartedAt(null)
    setAccumulated(0)
    setCurrentTaskId('')
    setCurrentDescription('')
  }

  const discardTimer = async () => {
    if (!(await confirm({ title: t('time.discardConfirm'), confirmLabel: t('time.discard') }))) return
    resetTimer()
    setError('')
  }

  const stopAndSave = async () => {
    if (!workspaceId || saving) return

    if (seconds <= 0) {
      resetTimer()
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          task_id: currentTaskId || null,
          project_id: null,
          duration: seconds,
          description: currentDescription.trim() || LEGACY_DESCRIPTION,
          date: ymd(new Date()),
        }),
      })

      if (!response.ok) throw new Error('save failed')

      resetTimer()
      const thisWeek = weekStartOf(new Date())
      if (isSameDay(thisWeek, weekStart)) loadEntries()
      else setWeekStart(thisWeek)
    } catch (saveError) {
      console.error('Error saving time entry:', saveError)
      setError(t('time.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const continueEntry = (entry: TimeEntry) => {
    if (running || seconds > 0) return
    setCurrentTaskId(entry.task_id || '')
    setCurrentDescription(entry.description === LEGACY_DESCRIPTION ? '' : entry.description)
    startTimer()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteEntry = async (entry: TimeEntry) => {
    if (!(await confirm({ title: t('time.deleteEntryConfirm'), confirmLabel: t('time.deleteEntry') }))) return
    try {
      const response = await fetch(`/api/time-entries?id=${entry.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete failed')
      loadEntries()
    } catch (deleteError) {
      console.error('Error deleting time entry:', deleteError)
      setError(t('time.deleteFailed'))
    }
  }

  const formatClock = (total: number) => {
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const formatDuration = useCallback(
    (total: number) => {
      const hours = Math.floor(total / 3600)
      const minutes = Math.round((total % 3600) / 60)
      if (hours === 0) return t('time.minutesOnly', { minutes })
      return t('time.duration', { hours, minutes })
    },
    [t]
  )

  const entryTitle = (entry: TimeEntry) =>
    entry.task?.title ||
    (entry.description && entry.description !== LEGACY_DESCRIPTION ? entry.description : t('time.untitled'))

  const entryDetail = (entry: TimeEntry) => {
    const parts: string[] = []
    if (entry.task?.project?.name) parts.push(entry.task.project.name)
    if (entry.task?.title && entry.description && entry.description !== LEGACY_DESCRIPTION) parts.push(entry.description)
    return parts.join(' · ')
  }

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])

  const { dayTotals, byDay, weekTotal, byProject } = useMemo(() => {
    const totals = new Map<string, number>()
    const groups = new Map<string, TimeEntry[]>()
    const projects = new Map<string, number>()
    let total = 0
    for (const entry of entries) {
      const key = entry.date.slice(0, 10)
      totals.set(key, (totals.get(key) ?? 0) + entry.duration)
      groups.set(key, [...(groups.get(key) ?? []), entry])
      const project = entry.task?.project?.name || ''
      projects.set(project, (projects.get(project) ?? 0) + entry.duration)
      total += entry.duration
    }
    return {
      dayTotals: totals,
      byDay: groups,
      weekTotal: total,
      byProject: Array.from(projects.entries()).sort((a, b) => b[1] - a[1]),
    }
  }, [entries])

  const activeDays = Array.from(dayTotals.values()).filter((value) => value > 0).length
  const avgPerDay = activeDays > 0 ? weekTotal / activeDays : 0
  const maxDay = Math.max(0, ...Array.from(dayTotals.values()))
  const chartScale = Math.max(CHART_MIN_SCALE, maxDay)
  const todayKey = ymd(new Date())
  const isCurrentWeek = isSameDay(weekStart, weekStartOf(new Date()))

  useEffect(() => {
    setSelectedDay(null)
  }, [weekStart])

  const visibleDays = weekDays
    .map((day) => ymd(day))
    .filter((key) => byDay.has(key) && (selectedDay === null || key === selectedDay))
    .reverse()

  const dayLabel = (key: string) => {
    const date = new Date(`${key}T00:00:00`)
    if (key === todayKey) return t('time.today')
    if (isSameDay(date, subDays(new Date(), 1))) return t('time.yesterday')
    return format(date, 'EEEE, MMM d', { locale: dateLocale })
  }

  const weekLabel = `${format(weekStart, 'MMM d', { locale: dateLocale })} – ${format(addDays(weekStart, 6), 'MMM d', { locale: dateLocale })}`
  const timerIdle = !running && seconds === 0

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title={t('time.title')} description={t('time.subtitle')} />

      <section
        className={`rounded-2xl border bg-surface p-4 transition-colors sm:p-5 ${
          running ? 'border-primary/50' : 'border-border'
        } ${
          timerIdle
            ? ''
            : 'max-md:sticky max-md:top-[calc(var(--app-header-h,0px)+0.5rem)] max-md:z-20 max-md:shadow-md'
        }`}
        aria-label={t('time.title')}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-6">
          <div className="order-2 grid min-w-0 flex-1 gap-3 md:order-none md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <input
              type="text"
              placeholder={t('time.describeWork')}
              aria-label={t('time.describeWork')}
              value={currentDescription}
              enterKeyHint="go"
              onChange={(event) => setCurrentDescription(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && timerIdle) startTimer()
              }}
              className={fieldClass}
            />
            <TaskPicker
              value={currentTaskId}
              onChange={setCurrentTaskId}
              tasks={tasks}
              label={t('time.taskLabel')}
            />
          </div>

          {/* Phone: clock, fields, then big buttons (display: contents). md+: clock and buttons share a row. */}
          <div className="contents md:flex md:items-center md:justify-between md:gap-4 xl:justify-end">
            <div className="relative order-1 flex items-center justify-center md:order-none">
              <p
                className={`flex items-center gap-2.5 font-mono text-5xl font-semibold tabular-nums tracking-tight ${
                  running ? 'text-primary' : 'text-text-primary'
                }`}
                role="timer"
                aria-live="off"
              >
                {running ? <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden /> : null}
                {formatClock(seconds)}
              </p>
              {seconds > 0 && !running ? (
                <button
                  type="button"
                  onClick={discardTimer}
                  aria-label={t('time.discard')}
                  className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:bg-tertiary md:hidden"
                >
                  <Trash2 className="h-5 w-5" aria-hidden />
                </button>
              ) : null}
            </div>

            <div className="order-3 flex shrink-0 items-center gap-2 md:order-none">
              {seconds > 0 && !running ? (
                <button
                  type="button"
                  onClick={discardTimer}
                  aria-label={t('time.discard')}
                  title={t('time.discard')}
                  className="hidden h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:inline-flex"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              ) : null}

              {timerIdle ? (
                <Button onClick={startTimer} size="lg" className="h-14 w-full gap-2 text-base md:h-12 md:w-auto">
                  <Play className="h-5 w-5" aria-hidden />
                  {t('time.startTimer')}
                </Button>
              ) : running ? (
                <>
                  <Button variant="secondary" size="lg" onClick={pauseTimer} className="h-14 flex-1 gap-2 text-base md:h-12 md:flex-none">
                    <Pause className="h-5 w-5" aria-hidden />
                    {t('time.pause')}
                  </Button>
                  <Button
                    size="lg"
                    onClick={stopAndSave}
                    disabled={saving}
                    className="h-14 flex-[1.4] gap-2 whitespace-normal px-3 text-base leading-tight md:h-12 md:flex-none md:whitespace-nowrap md:px-6"
                  >
                    <Square className="h-5 w-5 shrink-0" aria-hidden />
                    {t('time.stopSave')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={stopAndSave}
                    disabled={saving}
                    className="h-14 flex-1 gap-2 whitespace-normal px-3 text-base leading-tight md:h-12 md:flex-none md:whitespace-nowrap md:px-6"
                  >
                    <Square className="h-5 w-5 shrink-0" aria-hidden />
                    {t('time.stopSave')}
                  </Button>
                  <Button size="lg" onClick={startTimer} className="h-14 flex-1 gap-2 text-base md:h-12 md:flex-none">
                    <Play className="h-5 w-5" aria-hidden />
                    {t('time.resume')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </section>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-12">
        {/* Week summary: below the list on phones, above it on tablets, side column on desktop */}
        <aside className="min-w-0 space-y-5 rounded-2xl border border-border bg-surface p-4 sm:p-5 order-last md:order-first xl:order-last xl:sticky xl:top-20 xl:col-span-4 2xl:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-1">
              <button
                type="button"
                onClick={() => setWeekStart((current) => addWeeks(current, -1))}
                aria-label={t('time.prevWeek')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:bg-tertiary sm:h-9 sm:w-9"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setWeekStart((current) => addWeeks(current, 1))}
                aria-label={t('time.nextWeek')}
                disabled={isCurrentWeek}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:bg-tertiary disabled:pointer-events-none disabled:opacity-40 sm:h-9 sm:w-9"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="min-w-0 text-right">
              <h2 className="text-sm font-semibold text-text-primary">{isCurrentWeek ? t('time.thisWeek') : weekLabel}</h2>
              {isCurrentWeek ? <p className="text-xs text-text-secondary">{weekLabel}</p> : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
            <div className="min-w-0">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-text-primary">{formatDuration(weekTotal)}</p>
                  <p className="text-xs text-text-secondary">{t('time.total')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums text-text-primary">{formatDuration(Math.round(avgPerDay))}</p>
                  <p className="text-xs text-text-secondary">{t('time.avgPerDay')}</p>
                </div>
              </div>

              <ul className="mt-4 grid grid-cols-7 gap-1 sm:gap-1.5">
                {weekDays.map((day) => {
                  const key = ymd(day)
                  const total = dayTotals.get(key) ?? 0
                  const selected = selectedDay === key
                  const isToday = key === todayKey
                  const height = total > 0 ? Math.max(6, (total / chartScale) * 100) : 0
                  return (
                    <li key={key} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedDay(selected ? null : key)}
                        disabled={total === 0}
                        aria-pressed={selected}
                        aria-label={`${format(day, 'EEEE, MMM d', { locale: dateLocale })}: ${formatDuration(total)}`}
                        className={`flex w-full flex-col items-center gap-1 rounded-lg px-0.5 py-1 transition-colors active:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          selected ? 'bg-primary/10' : total > 0 ? 'hover:bg-surface-hover' : ''
                        } disabled:cursor-default`}
                      >
                        <span className="h-4 text-xs font-medium tabular-nums text-text-secondary">
                          {total > 0 ? (total / 3600).toFixed(1) : ''}
                        </span>
                        <span className="flex h-24 w-full items-end justify-center rounded-md bg-surface-hover/60">
                          <span
                            className={`block w-full rounded-md transition-[height] duration-300 ${
                              isToday || selected ? 'bg-primary' : 'bg-primary/45'
                            }`}
                            style={{ height: `${height}%` }}
                          />
                        </span>
                        <span
                          className={`text-xs uppercase ${isToday ? 'font-semibold text-primary' : 'text-text-secondary'}`}
                        >
                          {format(day, 'EEE', { locale: dateLocale })}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            {byProject.length > 0 ? (
              <div className="min-w-0">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">{t('time.byProject')}</h3>
                <ul className="space-y-3">
                  {byProject.slice(0, 6).map(([name, total]) => (
                    <li key={name || '_none'}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-text-primary">{name || t('time.noProject')}</span>
                        <span className="shrink-0 tabular-nums text-text-secondary">{formatDuration(total)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-hover">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${weekTotal > 0 ? (total / weekTotal) * 100 : 0}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 space-y-4 xl:col-span-8 2xl:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h2 className="text-base font-semibold text-text-primary">{t('time.timeEntries')}</h2>
              {selectedDay ? (
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="inline-flex min-h-10 items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:bg-primary/20"
                >
                  {t('time.showAllDays')}
                </button>
              ) : null}
            </div>
            <Button variant="secondary" size="sm" className="h-11 gap-1.5 sm:h-8" onClick={() => setDialog({ entry: null })}>
              <Plus className="h-4 w-4" aria-hidden />
              {t('time.addEntry')}
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((item) => (
                <Skeleton key={item} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : visibleDays.length === 0 ? (
            <EmptyState title={t('time.noEntries')} />
          ) : (
            visibleDays.map((key) => (
              <section key={key} className="rounded-2xl border border-border bg-surface">
                <header className="flex items-baseline justify-between gap-3 rounded-t-2xl border-b border-border bg-surface-hover/60 px-4 py-2.5">
                  <h3 className="min-w-0 truncate text-sm font-semibold capitalize text-text-primary">{dayLabel(key)}</h3>
                  <p className="shrink-0 text-sm font-medium tabular-nums text-text-secondary">
                    {formatDuration(dayTotals.get(key) ?? 0)}
                  </p>
                </header>
                <ul className="divide-y divide-border">
                  {(byDay.get(key) ?? []).map((entry) => {
                    const detail = entryDetail(entry)
                    return (
                      <li key={entry.id} className="flex min-h-14 items-center gap-2 px-4 py-2 transition-colors hover:bg-surface-hover/60 active:bg-surface-hover">
                        <button
                          type="button"
                          onClick={() => setDialog({ entry })}
                          className="min-w-0 flex-1 rounded-lg py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span className="line-clamp-2 break-words text-sm font-medium text-text-primary sm:line-clamp-1">{entryTitle(entry)}</span>
                          {detail ? <span className="mt-0.5 block truncate text-xs text-text-secondary">{detail}</span> : null}
                        </button>
                        <span className="shrink-0 text-sm font-medium tabular-nums text-text-primary">
                          {formatDuration(entry.duration)}
                        </span>
                        <button
                          type="button"
                          onClick={() => continueEntry(entry)}
                          disabled={running || seconds > 0}
                          aria-label={t('time.continueEntry')}
                          title={t('time.continueEntry')}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:bg-tertiary disabled:pointer-events-none disabled:opacity-30 sm:h-9 sm:w-9"
                        >
                          <Play className="h-4 w-4" aria-hidden />
                        </button>
                        <IconMenu
                          label={t('time.entryActions')}
                          items={[
                            { label: t('time.editEntryTitle'), onClick: () => setDialog({ entry }) },
                            ...(!running && seconds === 0
                              ? [{ label: t('time.continueEntry'), onClick: () => continueEntry(entry) }]
                              : []),
                            { label: t('time.deleteEntry'), onClick: () => deleteEntry(entry), danger: true },
                          ]}
                        />
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </section>
      </div>

      <EntryDialog
        open={dialog !== null}
        entry={dialog?.entry ?? null}
        tasks={tasks}
        workspaceId={workspaceId}
        defaultDate={selectedDay ?? (isCurrentWeek ? todayKey : ymd(weekStart))}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null)
          loadEntries()
        }}
      />
      {confirmDialog}
    </div>
  )
}

function EntryDialog({
  open,
  entry,
  tasks,
  workspaceId,
  defaultDate,
  onClose,
  onSaved,
}: {
  open: boolean
  entry: TimeEntry | null
  tasks: Task[]
  workspaceId?: string
  defaultDate: string
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations('pages.tools')
  const [description, setDescription] = useState('')
  const [taskId, setTaskId] = useState('')
  const [date, setDate] = useState('')
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const originalHours = entry ? Math.floor(entry.duration / 3600) : 0
  const originalMinutes = entry ? Math.floor((entry.duration % 3600) / 60) : 0

  useEffect(() => {
    if (!open) return
    setDescription(entry && entry.description !== LEGACY_DESCRIPTION ? entry.description : '')
    setTaskId(entry?.task_id ?? '')
    setDate(entry ? entry.date.slice(0, 10) : defaultDate)
    setHours(String(originalHours))
    setMinutes(String(originalMinutes))
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, defaultDate])

  const h = Math.max(0, Math.floor(Number(hours) || 0))
  const m = Math.max(0, Math.min(59, Math.floor(Number(minutes) || 0)))
  const unchanged = entry !== null && h === originalHours && m === originalMinutes
  const duration = unchanged && entry ? entry.duration : h * 3600 + m * 60
  const canSave = Boolean(date) && duration > 0 && !saving

  const taskOptions = useMemo(() => {
    if (entry?.task_id && entry.task && !tasks.some((task) => task.id === entry.task_id)) {
      return [{ id: entry.task_id, title: entry.task.title, project: entry.task.project ?? undefined }, ...tasks]
    }
    return tasks
  }, [tasks, entry])

  const save = async () => {
    if (!canSave || !workspaceId) return
    setSaving(true)
    setError('')
    try {
      const body = {
        task_id: taskId || null,
        description: description.trim() || LEGACY_DESCRIPTION,
        duration,
        date,
      }
      const response = entry
        ? await fetch('/api/time-entries', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: entry.id, ...body }),
          })
        : await fetch('/api/time-entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, project_id: null, ...body }),
          })
      if (!response.ok) throw new Error('save failed')
      onSaved()
    } catch (saveError) {
      console.error('Error saving time entry:', saveError)
      setError(t('time.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={entry ? t('time.editEntryTitle') : t('time.newEntryTitle')}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" className="h-11 sm:h-10" onClick={onClose}>
            {t('time.cancel')}
          </Button>
          <Button type="submit" form="entry-form" className="h-12 sm:h-10" disabled={!canSave}>
            {saving ? t('time.saving') : t('time.save')}
          </Button>
        </>
      }
    >
      <form
        id="entry-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <label className="block text-sm text-text-secondary">
          {t('time.descriptionLabel')}
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('time.describeWork')}
            className={`${fieldClass} mt-1.5`}
            enterKeyHint="next"
            autoFocus
          />
        </label>

        <div className="block text-sm text-text-secondary">
          <span id="entry-task-label">{t('time.taskLabel')}</span>
          <TaskPicker
            className="mt-1.5"
            value={taskId}
            onChange={setTaskId}
            tasks={taskOptions}
            label={t('time.taskLabel')}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="col-span-3 block text-sm text-text-secondary sm:col-span-1">
            {t('time.dateLabel')}
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${fieldClass} mt-1.5`}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('time.hoursLabel')}
            <input
              type="number"
              inputMode="numeric"
              enterKeyHint="next"
              min={0}
              max={24}
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className={`${fieldClass} mt-1.5 tabular-nums`}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('time.minutesLabel')}
            <input
              type="number"
              inputMode="numeric"
              enterKeyHint="done"
              min={0}
              max={59}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className={`${fieldClass} mt-1.5 tabular-nums`}
            />
          </label>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
