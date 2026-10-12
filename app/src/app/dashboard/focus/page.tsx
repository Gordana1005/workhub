'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Maximize2, Minimize2, Pause, Play, RotateCcw, Search, Settings } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { enUS, mk } from 'date-fns/locale'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { PageHeader } from '@/components/ui/PageHeader'

interface Task {
  id: string
  title: string
  description: string | null
  is_completed?: boolean
}

interface FocusSession {
  id: string
  endedAt: string
  minutes: number
  taskTitle: string | null
}

type SessionType = 'work' | 'break' | 'longBreak'

interface SavedState {
  workDuration: number
  breakDuration: number
  longBreakDuration: number
  notifyEnabled: boolean
  sessionType: SessionType
  time: number
  endAt: number | null
  task: Task | null
}

const STATE_KEY = 'trackwork-focus'
const HISTORY_KEY = 'trackwork-focus-history'
const HISTORY_LIMIT = 200

const PRESETS: Record<SessionType, number[]> = {
  work: [15, 25, 45, 60, 90],
  break: [3, 5, 10],
  longBreak: [15, 20, 30],
}

const RING_RADIUS = 92
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const fieldClass =
  'w-full max-w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

const iconButton =
  'rounded-lg p-2.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

function safeMinutes(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), 180) : fallback
}

export default function FocusMode() {
  const t = useTranslations('pages.tools')
  const locale = useLocale()
  const dateLocale = locale === 'mk' ? mk : enUS
  const { currentWorkspace } = useWorkspaceStore()
  const rootRef = useRef<HTMLDivElement>(null)
  const endAtRef = useRef<number | null>(null)

  const [time, setTime] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionType, setSessionType] = useState<SessionType>('work')
  const [history, setHistory] = useState<FocusSession[]>([])
  const [hydrated, setHydrated] = useState(false)

  const [workDuration, setWorkDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [longBreakDuration, setLongBreakDuration] = useState(15)
  const [showSettings, setShowSettings] = useState(false)
  const [notifyEnabled, setNotifyEnabled] = useState(true)

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [showTaskSelector, setShowTaskSelector] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [canFullscreen, setCanFullscreen] = useState(false)

  const minutesFor = useCallback(
    (type: SessionType) => {
      if (type === 'work') return safeMinutes(workDuration, 25)
      if (type === 'break') return safeMinutes(breakDuration, 5)
      return safeMinutes(longBreakDuration, 15)
    },
    [workDuration, breakDuration, longBreakDuration]
  )

  const todaySessions = useMemo(
    () => history.filter((session) => isSameDay(new Date(session.endedAt), new Date())),
    [history]
  )
  const sessionsToday = todaySessions.length
  const focusedSeconds = todaySessions.reduce((sum, session) => sum + session.minutes * 60, 0)

  const formatDuration = useCallback(
    (totalSeconds: number) => {
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.round((totalSeconds % 3600) / 60)
      return hours === 0 ? t('time.minutesOnly', { minutes }) : t('time.duration', { hours, minutes })
    },
    [t]
  )

  // Restore settings, the running/paused session and today's history.
  useEffect(() => {
    try {
      const rawHistory = window.localStorage.getItem(HISTORY_KEY)
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory)
        if (Array.isArray(parsed)) setHistory(parsed)
      }
      const raw = window.localStorage.getItem(STATE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SavedState>
        setWorkDuration(safeMinutes(Number(saved.workDuration), 25))
        setBreakDuration(safeMinutes(Number(saved.breakDuration), 5))
        setLongBreakDuration(safeMinutes(Number(saved.longBreakDuration), 15))
        if (typeof saved.notifyEnabled === 'boolean') setNotifyEnabled(saved.notifyEnabled)
        if (saved.task && typeof saved.task.id === 'string') setSelectedTask(saved.task)
        const type: SessionType =
          saved.sessionType === 'break' || saved.sessionType === 'longBreak' ? saved.sessionType : 'work'
        setSessionType(type)
        if (typeof saved.endAt === 'number') {
          const remaining = Math.max(0, Math.ceil((saved.endAt - Date.now()) / 1000))
          endAtRef.current = saved.endAt
          setTime(remaining)
          setIsRunning(true)
        } else if (typeof saved.time === 'number' && saved.time > 0) {
          setTime(Math.round(saved.time))
        } else {
          const fallback = type === 'work' ? saved.workDuration : type === 'break' ? saved.breakDuration : saved.longBreakDuration
          setTime(safeMinutes(Number(fallback), type === 'work' ? 25 : type === 'break' ? 5 : 15) * 60)
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true)
  }, [])

  // While running, the stored endAt is authoritative, so the per-second `time` is not persisted.
  const savedTime = isRunning ? 0 : time

  useEffect(() => {
    if (!hydrated) return
    try {
      const state: SavedState = {
        workDuration,
        breakDuration,
        longBreakDuration,
        notifyEnabled,
        sessionType,
        time: savedTime,
        endAt: isRunning ? endAtRef.current : null,
        task: selectedTask
          ? { id: selectedTask.id, title: selectedTask.title, description: selectedTask.description }
          : null,
      }
      window.localStorage.setItem(STATE_KEY, JSON.stringify(state))
    } catch {
      // ignore storage errors
    }
  }, [hydrated, workDuration, breakDuration, longBreakDuration, notifyEnabled, sessionType, savedTime, isRunning, selectedTask])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)))
    } catch {
      // ignore storage errors
    }
  }, [hydrated, history])

  const loadTasks = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      const res = await fetch(`/api/tasks?workspace_id=${currentWorkspace.id}`)
      const data = await res.json()

      if (Array.isArray(data)) {
        setTasks(data.filter((task: Task) => !task.is_completed).slice(0, 100))
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  // Only the workspace id matters: the store hands out a fresh object on every refresh, which would refetch needlessly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id])

  useEffect(() => {
    if (currentWorkspace) {
      loadTasks()
    }
  }, [currentWorkspace, loadTasks])

  const handleSessionComplete = useCallback(() => {
    setIsRunning(false)
    endAtRef.current = null

    if (notifyEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(t('focus.notifyTitle'), {
        body: sessionType === 'work' ? t('focus.notifyBreak') : t('focus.notifyReady'),
      })
    }

    if (sessionType === 'work') {
      const entry: FocusSession = {
        id: `${Date.now()}`,
        endedAt: new Date().toISOString(),
        minutes: minutesFor('work'),
        taskTitle: selectedTask?.title ?? null,
      }
      setHistory((current) => [entry, ...current].slice(0, HISTORY_LIMIT))
      if ((sessionsToday + 1) % 4 === 0) {
        setSessionType('longBreak')
        setTime(minutesFor('longBreak') * 60)
      } else {
        setSessionType('break')
        setTime(minutesFor('break') * 60)
      }
    } else {
      setSessionType('work')
      setTime(minutesFor('work') * 60)
    }
  }, [notifyEnabled, sessionType, sessionsToday, selectedTask, minutesFor, t])

  useEffect(() => {
    if (!isRunning || time > 0) return
    const timeout = window.setTimeout(() => handleSessionComplete(), 0)
    return () => window.clearTimeout(timeout)
  }, [isRunning, time, handleSessionComplete])

  // Count down from a fixed end timestamp so the timer stays correct in background tabs.
  useEffect(() => {
    if (!isRunning) return
    const tick = () => {
      const endAt = endAtRef.current
      if (endAt === null) return
      setTime(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)))
    }
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [isRunning])

  // Show the remaining time in the browser tab while a session runs.
  const sessionLabel =
    sessionType === 'work' ? t('focus.focusTime') : sessionType === 'break' ? t('focus.shortBreak') : t('focus.longBreak')
  const clock = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`

  useEffect(() => {
    if (!isRunning) return
    const previous = document.title
    document.title = `${clock} · ${sessionLabel}`
    return () => {
      document.title = previous
    }
  }, [isRunning, clock, sessionLabel])

  useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled))
    const onChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void rootRef.current?.requestFullscreen?.().catch(() => undefined)
    }
  }

  const startSession = (type: SessionType) => {
    setSessionType(type)
    setTime(minutesFor(type) * 60)
    setIsRunning(false)
    endAtRef.current = null
  }

  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false)
      endAtRef.current = null
      return
    }
    if (time <= 0) return
    if (typeof Notification !== 'undefined' && Notification.permission === 'default' && notifyEnabled) {
      void Notification.requestPermission()
    }
    endAtRef.current = Date.now() + time * 1000
    setIsRunning(true)
  }

  const resetTimer = () => startSession(sessionType)

  const choosePreset = (type: SessionType, minutes: number) => {
    if (type === 'work') setWorkDuration(minutes)
    else if (type === 'break') setBreakDuration(minutes)
    else setLongBreakDuration(minutes)
    if (!isRunning) setTime(minutes * 60)
  }

  const totalSeconds = minutesFor(sessionType) * 60
  const progress = Math.min(100, Math.max(0, ((totalSeconds - time) / totalSeconds) * 100))
  const started = time < totalSeconds
  const primaryLabel = isRunning ? t('focus.pause') : started ? t('focus.resume') : t('focus.start')

  const closeSettings = () => {
    if (!isRunning) setTime(minutesFor(sessionType) * 60)
    setShowSettings(false)
  }

  const filteredTasks = useMemo(() => {
    const needle = taskSearch.trim().toLowerCase()
    return needle ? tasks.filter((task) => task.title.toLowerCase().includes(needle)) : tasks
  }, [tasks, taskSearch])

  const tabClass = (active: boolean) =>
    `h-9 flex-1 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none ${
      active ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
    }`

  const ringTone = sessionType === 'work' ? 'stroke-primary' : 'stroke-success'

  return (
    <div
      ref={rootRef}
      className={
        isFullscreen
          ? 'flex min-h-[100dvh] flex-col items-center justify-center overflow-auto bg-background p-6'
          : 'min-w-0 space-y-6'
      }
    >
      {isFullscreen ? null : (
        <PageHeader
          title={t('focus.title')}
          description={t('focus.subtitle')}
          action={
            <div className="flex items-center gap-1">
              {canFullscreen ? (
                <button type="button" onClick={toggleFullscreen} aria-label={t('focus.fullscreen')} title={t('focus.fullscreen')} className={iconButton}>
                  <Maximize2 className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
              <button type="button" onClick={() => setShowSettings(true)} aria-label={t('focus.settings')} title={t('focus.settings')} className={iconButton}>
                <Settings className="h-4 w-4" aria-hidden />
              </button>
            </div>
          }
        />
      )}

      <div className={isFullscreen ? 'w-full' : 'grid min-w-0 items-start gap-6 xl:grid-cols-12'}>
        <section
          className={
            isFullscreen
              ? 'mx-auto flex w-full max-w-2xl flex-col items-center gap-8'
              : 'flex min-w-0 flex-col items-center gap-6 rounded-2xl border border-border bg-surface px-4 py-8 sm:py-10 xl:col-span-8 2xl:col-span-9'
          }
        >
          <div className="flex w-full max-w-sm gap-0.5 rounded-xl bg-surface-hover p-0.5" role="group" aria-label={t('focus.title')}>
            <button type="button" aria-pressed={sessionType === 'work'} onClick={() => startSession('work')} className={tabClass(sessionType === 'work')}>
              {t('focus.focusTime')}
            </button>
            <button type="button" aria-pressed={sessionType === 'break'} onClick={() => startSession('break')} className={tabClass(sessionType === 'break')}>
              {t('focus.shortBreak')}
            </button>
            <button type="button" aria-pressed={sessionType === 'longBreak'} onClick={() => startSession('longBreak')} className={tabClass(sessionType === 'longBreak')}>
              {t('focus.longBreak')}
            </button>
          </div>

          <div
            className={`relative aspect-square ${isFullscreen ? 'w-[min(80vw,65vh)]' : 'w-[min(78vw,20rem)] sm:w-[min(70vw,24rem)] 2xl:w-[26rem]'}`}
          >
            <svg
              viewBox="0 0 200 200"
              className="absolute inset-0 h-full w-full -rotate-90"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={sessionLabel}
            >
              <circle cx="100" cy="100" r={RING_RADIUS} fill="none" strokeWidth="5" className="stroke-surface-hover" />
              <circle
                cx="100"
                cy="100"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress / 100)}
                className={`${ringTone} transition-[stroke-dashoffset] duration-300 ease-linear`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm font-medium text-text-secondary">{sessionLabel}</p>
              <p className="font-mono text-6xl font-semibold tabular-nums tracking-tight text-text-primary sm:text-7xl" aria-live="off">
                {clock}
              </p>
              {isFullscreen ? (
                selectedTask ? <p className="line-clamp-2 max-w-full break-words text-sm text-text-secondary">{selectedTask.title}</p> : null
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTaskSelector(true)}
                  className="mt-1 max-w-full rounded-lg px-2 py-1 text-sm text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="line-clamp-2 break-words">
                    {selectedTask ? selectedTask.title : t('focus.selectTaskPrompt')}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={resetTimer} aria-label={t('focus.reset')} title={t('focus.reset')} className={iconButton}>
              <RotateCcw className="h-5 w-5" aria-hidden />
            </button>
            <Button onClick={toggleTimer} size="lg" className="min-w-[10rem] gap-2">
              {isRunning ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
              {primaryLabel}
            </Button>
            {isFullscreen ? (
              <button type="button" onClick={toggleFullscreen} aria-label={t('focus.exitFullscreen')} title={t('focus.exitFullscreen')} className={iconButton}>
                <Minimize2 className="h-5 w-5" aria-hidden />
              </button>
            ) : (
              <span className="w-10" aria-hidden />
            )}
          </div>

          {isFullscreen ? null : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t('focus.presetsLabel')}>
                {PRESETS[sessionType].map((minutes) => {
                  const active = minutesFor(sessionType) === minutes
                  return (
                    <button
                      key={minutes}
                      type="button"
                      aria-pressed={active}
                      disabled={isRunning}
                      onClick={() => choosePreset(sessionType, minutes)}
                      className={`h-9 rounded-full border px-4 text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 ${
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                      }`}
                    >
                      {t('time.minutesOnly', { minutes })}
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-center gap-2" aria-hidden>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full ${index < sessionsToday % 4 ? 'bg-primary' : 'bg-surface-hover'}`}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {isFullscreen ? null : (
          <aside className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5 xl:sticky xl:top-20 xl:col-span-4 2xl:col-span-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-text-primary">{t('focus.historyTitle')}</h2>
              <p className="text-xs text-text-secondary">{t('focus.sessionsCompleted', { count: sessionsToday })}</p>
            </div>
            {sessionsToday > 0 ? (
              <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
                {formatDuration(focusedSeconds)}
                <span className="ml-2 text-xs font-normal text-text-secondary">{t('focus.focused')}</span>
              </p>
            ) : null}
            {todaySessions.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-text-secondary">
                {t('focus.historyEmpty')}
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {todaySessions.map((session) => (
                  <li key={session.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-12 shrink-0 text-xs tabular-nums text-text-secondary">
                      {format(new Date(session.endedAt), 'HH:mm', { locale: dateLocale })}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {session.taskTitle ?? t('focus.freeFocus')}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-text-secondary">
                      {t('time.minutesOnly', { minutes: session.minutes })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>

      <Dialog
        open={showSettings}
        title={t('focus.pomodoroSettings')}
        onClose={closeSettings}
        footer={
          <Button type="button" className="w-full sm:w-auto" onClick={closeSettings}>
            {t('focus.save')}
          </Button>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm text-text-secondary">
            {t('focus.workDuration')}
            <input
              type="number"
              value={workDuration}
              onChange={(event) => setWorkDuration(Number(event.target.value))}
              className={`${fieldClass} mt-1.5`}
              min="1"
              max="180"
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('focus.shortBreakMinutes')}
            <input
              type="number"
              value={breakDuration}
              onChange={(event) => setBreakDuration(Number(event.target.value))}
              className={`${fieldClass} mt-1.5`}
              min="1"
              max="60"
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('focus.longBreakMinutes')}
            <input
              type="number"
              value={longBreakDuration}
              onChange={(event) => setLongBreakDuration(Number(event.target.value))}
              className={`${fieldClass} mt-1.5`}
              min="1"
              max="60"
            />
          </label>
          <label className="flex items-start gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={notifyEnabled}
              onChange={(event) => setNotifyEnabled(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span>{t('focus.notifyToggle')}</span>
          </label>
        </div>
      </Dialog>

      <Dialog
        open={showTaskSelector}
        title={t('focus.selectTask')}
        onClose={() => {
          setShowTaskSelector(false)
          setTaskSearch('')
        }}
        size="lg"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              type="search"
              value={taskSearch}
              onChange={(event) => setTaskSearch(event.target.value)}
              placeholder={t('focus.searchTasks')}
              aria-label={t('focus.searchTasks')}
              className={`${fieldClass} pl-9`}
            />
          </div>
          {selectedTask ? (
            <button
              type="button"
              onClick={() => {
                setSelectedTask(null)
                setShowTaskSelector(false)
                setTaskSearch('')
              }}
              className="w-full rounded-xl border border-dashed border-border px-3 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('focus.noTask')}
            </button>
          ) : null}
          {filteredTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-secondary">{t('focus.noTasks')}</p>
          ) : (
            <ul className="space-y-1.5">
              {filteredTasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTask(task)
                      setShowTaskSelector(false)
                      setTaskSearch('')
                    }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      selectedTask?.id === task.id ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <span className="block break-words text-sm font-medium text-text-primary">{task.title}</span>
                    {task.description ? (
                      <span className="mt-0.5 line-clamp-2 block break-words text-xs text-text-secondary">{task.description}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>
    </div>
  )
}
