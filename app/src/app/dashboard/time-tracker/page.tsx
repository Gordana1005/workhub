'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Pause, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { useTranslations } from 'next-intl'

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
  task?: { title: string; project?: { name: string } }
}

interface WeekDay {
  day: string
  hours: number
}

const fieldClass =
  'w-full max-w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export default function TimeTrackerPage() {
  const t = useTranslations('pages.tools')
  const { currentWorkspace } = useWorkspaceStore()
  const [isTracking, setIsTracking] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [currentTaskId, setCurrentTaskId] = useState('')
  const [currentDescription, setCurrentDescription] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStats, setWeekStats] = useState<WeekDay[]>([])

  useEffect(() => {
    if (!isTracking) return
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isTracking])

  const loadWeeklyStats = useCallback(async () => {
    if (!currentWorkspace) return

    const dayNames = [
      t('time.daySun'),
      t('time.dayMon'),
      t('time.dayTue'),
      t('time.dayWed'),
      t('time.dayThu'),
      t('time.dayFri'),
      t('time.daySat'),
    ]

    try {
      const days: string[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        days.push(date.toISOString().split('T')[0])
      }

      const startDate = days[0]
      const endDate = days[days.length - 1]
      const res = await fetch(
        `/api/time-entries?workspace_id=${currentWorkspace.id}&start_date=${startDate}&end_date=${endDate}`
      )
      const data = await res.json()
      const entries: { date: string; duration: number }[] = data.timeEntries || []

      setWeekStats(
        days.map((date) => {
          const dayEntries = entries.filter((entry) => entry.date === date)
          const totalHours = dayEntries.reduce((sum, entry) => sum + entry.duration / 3600, 0)
          return {
            day: dayNames[new Date(`${date}T00:00:00`).getDay()],
            hours: Math.round(totalHours * 10) / 10,
          }
        })
      )
    } catch (error) {
      console.error('Error loading weekly stats:', error)
      setWeekStats([
        { day: t('time.dayMon'), hours: 0 },
        { day: t('time.dayTue'), hours: 0 },
        { day: t('time.dayWed'), hours: 0 },
        { day: t('time.dayThu'), hours: 0 },
        { day: t('time.dayFri'), hours: 0 },
        { day: t('time.daySat'), hours: 0 },
        { day: t('time.daySun'), hours: 0 },
      ])
    }
  }, [currentWorkspace, t])

  const loadTasks = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      const res = await fetch(`/api/tasks?workspace_id=${currentWorkspace.id}`)
      const data = await res.json()

      if (Array.isArray(data)) {
        const formattedData = data
          .filter((task: { is_completed?: boolean }) => !task.is_completed)
          .map((task: { id: string; title: string; projects?: { name: string } | null }) => ({
            id: task.id,
            title: task.title,
            project: task.projects ? { name: task.projects.name } : undefined,
          }))
        setTasks(formattedData)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }, [currentWorkspace])

  const loadTimeEntries = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/time-entries?workspace_id=${currentWorkspace.id}&date=${today}`)
      const data = await res.json()

      if (data.timeEntries) {
        setTimeEntries(data.timeEntries)
      }

      await loadWeeklyStats()
    } catch (error) {
      console.error('Error loading time entries:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace, loadWeeklyStats])

  useEffect(() => {
    if (currentWorkspace) {
      loadTasks()
      loadTimeEntries()
    } else {
      setLoading(false)
    }
  }, [currentWorkspace, loadTasks, loadTimeEntries])

  const handleStart = () => {
    setIsTracking(true)
  }

  const handleStop = async () => {
    if (!currentWorkspace) return

    if (seconds <= 0) {
      setIsTracking(false)
      return
    }

    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          task_id: currentTaskId || null,
          project_id: null,
          duration: seconds,
          description: currentDescription || 'Time tracking',
          date: new Date().toISOString().split('T')[0],
        }),
      })

      if (!response.ok) throw new Error('save failed')

      setIsTracking(false)
      setSeconds(0)
      setCurrentTaskId('')
      setCurrentDescription('')
      loadTimeEntries()
    } catch (error) {
      console.error('Error saving time entry:', error)
      alert(t('time.saveFailed'))
    }
  }

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    return t('time.duration', { hours, minutes })
  }

  const totalToday = timeEntries.reduce((sum, entry) => sum + entry.duration, 0)
  const weekTotal = weekStats.reduce((sum, day) => sum + day.hours, 0)
  const activeDays = weekStats.filter((day) => day.hours > 0).length
  const weekAverage = activeDays > 0 ? weekTotal / activeDays : 0
  const canStart = Boolean(currentTaskId || currentDescription.trim())

  return (
    <div className="space-y-6">
      <PageHeader title={t('time.title')} description={t('time.subtitle')} />

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <p className="text-center font-mono text-5xl font-semibold tabular-nums tracking-tight text-text-primary sm:text-6xl">
          {formatTime(seconds)}
        </p>
        <select
          value={currentTaskId}
          onChange={(event) => setCurrentTaskId(event.target.value)}
          className={fieldClass}
        >
          <option value="">{t('time.selectTask')}</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
              {task.project ? ` (${task.project.name})` : ''}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder={t('time.describeWork')}
          value={currentDescription}
          onChange={(event) => setCurrentDescription(event.target.value)}
          className={fieldClass}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          {!isTracking ? (
            <Button onClick={handleStart} disabled={!canStart} className="w-full gap-2 sm:w-auto">
              <Play className="h-4 w-4" />
              {t('time.startTimer')}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setIsTracking(false)} className="w-full gap-2 sm:w-auto">
              <Pause className="h-4 w-4" />
              {t('time.pause')}
            </Button>
          )}
          {(isTracking || seconds > 0) && (
            <Button onClick={handleStop} className="w-full gap-2 sm:w-auto">
              <Square className="h-4 w-4" />
              {t('time.stopSave')}
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">{t('time.todaysEntries')}</h2>
          <p className="shrink-0 text-sm text-text-secondary">{formatDuration(totalToday)}</p>
        </div>
        {loading ? (
          <p className="text-sm text-text-secondary">{t('time.loadingEntries')}</p>
        ) : timeEntries.length === 0 ? (
          <EmptyState title={t('time.noEntries')} />
        ) : (
          <ul className="space-y-2">
            {timeEntries.map((entry) => (
              <li key={entry.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-text-primary">{entry.task?.title || entry.description}</p>
                    {entry.task?.project?.name ? (
                      <p className="mt-1 break-words text-sm text-text-secondary">{entry.task.project.name}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-sm font-medium text-text-primary">{formatDuration(entry.duration)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!loading && timeEntries.length > 0 ? (
          <p className="text-sm text-text-secondary">
            {t('time.totalToday')}: {formatDuration(totalToday)}
          </p>
        ) : null}
      </section>

      {weekStats.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-text-primary">{t('time.thisWeek')}</h2>
          <p className="text-sm text-text-secondary">
            {t('time.total')}: {t('time.hoursValue', { hours: weekTotal.toFixed(1) })} · {t('time.avgPerDay')}:{' '}
            {t('time.hoursValue', { hours: weekAverage.toFixed(1) })}
          </p>
          <ul className="space-y-2">
            {weekStats.map((day, index) => (
              <li key={`${day.day}-${index}`}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-text-secondary">{day.day}</span>
                  <span className="text-text-primary">{t('time.hoursValue', { hours: day.hours })}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (day.hours / 10) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
