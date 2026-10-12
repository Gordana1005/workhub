'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Pause, Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'

interface Task {
  id: string
  title: string
  description: string | null
  estimated_hours: number | null
  is_completed?: boolean
}

type SessionType = 'work' | 'break' | 'longBreak'

const fieldClass =
  'w-full max-w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

function safeMinutes(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export default function FocusMode() {
  const t = useTranslations('pages.tools')
  const router = useRouter()
  const { currentWorkspace } = useWorkspaceStore()

  const [time, setTime] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionType, setSessionType] = useState<SessionType>('work')
  const [sessionsCompleted, setSessionsCompleted] = useState(0)

  const [workDuration, setWorkDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [longBreakDuration, setLongBreakDuration] = useState(15)
  const [showSettings, setShowSettings] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [showTaskSelector, setShowTaskSelector] = useState(false)

  const minutesFor = useCallback(
    (type: SessionType) => {
      if (type === 'work') return safeMinutes(workDuration, 25)
      if (type === 'break') return safeMinutes(breakDuration, 5)
      return safeMinutes(longBreakDuration, 15)
    },
    [workDuration, breakDuration, longBreakDuration]
  )

  const loadTasks = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      const res = await fetch(`/api/tasks?workspace_id=${currentWorkspace.id}`)
      const data = await res.json()

      if (Array.isArray(data)) {
        setTasks(data.filter((task: Task) => !task.is_completed).slice(0, 20))
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }, [currentWorkspace])

  const handleSessionComplete = useCallback(() => {
    setIsRunning(false)

    if (soundEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(t('focus.notifyTitle'), {
        body: sessionType === 'work' ? t('focus.notifyBreak') : t('focus.notifyReady'),
      })
    }

    if (sessionType === 'work') {
      const newCount = sessionsCompleted + 1
      setSessionsCompleted(newCount)
      if (newCount % 4 === 0) {
        setSessionType('longBreak')
        setTime(safeMinutes(longBreakDuration, 15) * 60)
      } else {
        setSessionType('break')
        setTime(safeMinutes(breakDuration, 5) * 60)
      }
    } else {
      setSessionType('work')
      setTime(safeMinutes(workDuration, 25) * 60)
    }
  }, [soundEnabled, sessionType, sessionsCompleted, breakDuration, longBreakDuration, workDuration, t])

  useEffect(() => {
    if (currentWorkspace) {
      loadTasks()
    }
  }, [currentWorkspace, loadTasks])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!isRunning || time > 0) return
    const timeout = window.setTimeout(() => handleSessionComplete(), 0)
    return () => window.clearTimeout(timeout)
  }, [isRunning, time, handleSessionComplete])

  useEffect(() => {
    if (!isRunning || time <= 0) return
    const interval = setInterval(() => {
      setTime((prevTime) => (prevTime <= 1 ? 0 : prevTime - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, time])

  const startSession = (type: SessionType) => {
    setSessionType(type)
    setTime(minutesFor(type) * 60)
    setIsRunning(false)
  }

  const toggleTimer = () => {
    setIsRunning((running) => !running)
  }

  const resetTimer = () => {
    setIsRunning(false)
    startSession(sessionType)
  }

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const getProgress = () => {
    const total = minutesFor(sessionType) * 60
    return Math.min(100, Math.max(0, ((total - time) / total) * 100))
  }

  const getSessionLabel = () => {
    if (sessionType === 'work') return t('focus.focusTime')
    if (sessionType === 'break') return t('focus.shortBreak')
    return t('focus.longBreak')
  }

  const closeSettings = () => {
    if (!isRunning) setTime(minutesFor(sessionType) * 60)
    setShowSettings(false)
  }

  const sessionButtonClass = (active: boolean) =>
    active
      ? 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white'
      : 'rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary'

  return (
    <div className="space-y-8">
      <PageHeader
        title={getSessionLabel()}
        description={t('focus.sessionsCompleted', { count: sessionsCompleted })}
        action={
          <IconMenu
            label={t('focus.settings')}
            items={[
              { label: t('focus.change'), onClick: () => setShowTaskSelector(true) },
              { label: t('focus.settings'), onClick: () => setShowSettings(true) },
              { label: t('focus.reset'), onClick: resetTimer },
              { label: t('focus.exit'), onClick: () => router.push('/dashboard') },
            ]}
          />
        }
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => startSession('work')} className={sessionButtonClass(sessionType === 'work')}>
          {t('focus.work')}
        </button>
        <button type="button" onClick={() => startSession('break')} className={sessionButtonClass(sessionType === 'break')}>
          {t('focus.break')}
        </button>
        <button
          type="button"
          onClick={() => startSession('longBreak')}
          className={sessionButtonClass(sessionType === 'longBreak')}
        >
          {t('focus.longBreak')}
        </button>
      </div>

      <div className="space-y-5 py-4 text-center">
        <p className="font-mono text-6xl font-semibold tabular-nums tracking-tight text-text-primary sm:text-7xl">
          {formatTime(time)}
        </p>
        <div
          className="mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-hover"
          role="progressbar"
          aria-valuenow={Math.round(getProgress())}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={getSessionLabel()}
        >
          <div className="h-full bg-primary" style={{ width: `${getProgress()}%` }} />
        </div>
        <button type="button" onClick={() => setShowTaskSelector(true)} className="mx-auto block max-w-full text-sm text-primary">
          <span className="break-words">
            {selectedTask ? `${t('focus.workingOn')} ${selectedTask.title}` : t('focus.selectTaskPrompt')}
          </span>
        </button>
        {selectedTask?.description ? (
          <p className="mx-auto line-clamp-3 max-w-md break-words text-sm text-text-secondary">{selectedTask.description}</p>
        ) : null}
        <div className="flex justify-center">
          <Button onClick={toggleTimer} className="gap-2">
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isRunning ? t('focus.pause') : t('focus.start')}
          </Button>
        </div>
        <div className="flex justify-center gap-2" aria-hidden>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`h-2.5 w-2.5 rounded-full ${index < sessionsCompleted % 4 ? 'bg-primary' : 'bg-surface-hover'}`}
            />
          ))}
        </div>
      </div>

      <Dialog
        open={showSettings}
        title={t('focus.pomodoroSettings')}
        onClose={closeSettings}
        footer={
          <Button type="button" className="w-full" onClick={closeSettings}>
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
              max="60"
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
              max="30"
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
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>{t('focus.notifyToggle')}</span>
          </label>
        </div>
      </Dialog>

      <Dialog open={showTaskSelector} title={t('focus.selectTask')} onClose={() => setShowTaskSelector(false)} size="lg">
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">{t('focus.noTasks')}</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  setSelectedTask(task)
                  setShowTaskSelector(false)
                }}
                className="w-full rounded-xl border border-border px-3 py-3 text-left hover:bg-surface-hover"
              >
                <span className="block break-words font-medium text-text-primary">{task.title}</span>
                {task.description ? (
                  <span className="mt-1 line-clamp-2 block break-words text-sm text-text-secondary">{task.description}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  )
}
