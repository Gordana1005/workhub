'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { Clock, Play, Plus, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { localDateString } from '@/lib/date'
import { formatClock, formatDuration, parseDuration, timeProgress } from '@/lib/task-time'
import { useTimerStore } from '@/stores/useTimerStore'
import { dayKey, parseDayKey } from './taskUtils'
import type { Task } from './types'

interface TimeEntry {
  id: string
  duration: number
  date: string | null
  description: string | null
  user_id: string
  user?: { id: string; username: string; avatar_url?: string | null } | null
}

const COLLAPSED_COUNT = 4

/**
 * "Time" section of the task detail panel: a start/stop button bound to this task (shared with the
 * shell's timer chip), logged time vs the estimate, the recent entries of everyone, and a small
 * dialog to add time by hand.
 */
export default function TaskTimeSection({
  task,
  workspaceId,
  currentUserId,
  onLoggedSeconds,
}: {
  task: Task
  workspaceId: string
  currentUserId: string
  /** Reports the task's total logged seconds after every (re)load. */
  onLoggedSeconds?: (seconds: number) => void
}) {
  const t = useTranslations('pages.tasks')
  const format = useFormatter()
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const isRunning = useTimerStore((s) => s.isRunning)
  const runningTaskId = useTimerStore((s) => s.currentTaskId)
  const elapsed = useTimerStore((s) => s.time)
  const startTimer = useTimerStore((s) => s.start)
  const stopTimer = useTimerStore((s) => s.stop)

  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const onLoggedRef = useRef(onLoggedSeconds)
  onLoggedRef.current = onLoggedSeconds

  const runningHere = isRunning && runningTaskId === task.id
  const runningElsewhere = isRunning && runningTaskId !== task.id

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ workspace_id: workspaceId, task_id: task.id, limit: '50' })
      const response = await fetch(`/api/time-entries?${params.toString()}`)
      if (!response.ok) throw new Error('load failed')
      const payload = await response.json()
      setEntries(Array.isArray(payload.timeEntries) ? payload.timeEntries : [])
      const total = Number(payload.totalSeconds) || 0
      setTotalSeconds(total)
      setLoadFailed(false)
      onLoggedRef.current?.(total)
    } catch {
      setLoadFailed(true)
    } finally {
      setLoaded(true)
    }
  }, [task.id, workspaceId])

  useEffect(() => {
    setLoaded(false)
    setEntries([])
    setTotalSeconds(0)
    load()
  }, [load])

  // The shell chip (or this section) stopped a timer: pick up the entry it just saved
  useEffect(() => {
    const onSaved = (event: Event) => {
      const savedFor = (event as CustomEvent<{ taskId?: string | null }>).detail?.taskId
      if (savedFor === task.id) load()
    }
    window.addEventListener('trackwork:time-entry-saved', onSaved)
    return () => window.removeEventListener('trackwork:time-entry-saved', onSaved)
  }, [task.id, load])

  const toggleTimer = async () => {
    if (runningHere) {
      await stopTimer()
      return
    }
    if (isRunning) await stopTimer()
    startTimer(task.id, task.project_id || undefined)
  }

  const removeEntry = async (entry: TimeEntry) => {
    if (!(await confirm({ title: t('confirmDeleteTimeEntry'), confirmLabel: t('deleteTimeEntry') }))) return
    try {
      const response = await fetch(`/api/time-entries?id=${entry.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete failed')
      await load()
    } catch {
      toast.error(t('timeDeleteFailed'))
    }
  }

  const liveSeconds = totalSeconds + (runningHere ? elapsed : 0)
  const progress = timeProgress(liveSeconds, task.estimated_hours)
  const visibleEntries = expanded ? entries : entries.slice(0, COLLAPSED_COUNT)
  const dur = (seconds: number) => formatDuration(seconds, t)

  return (
    <section aria-label={t('timeSection')} className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary">{t('timeSection')}</h3>
        <Button
          type="button"
          size="sm"
          variant={runningHere ? 'danger' : 'secondary'}
          onClick={toggleTimer}
          leftIcon={runningHere ? <Square className="fill-current" /> : <Play className="fill-current" />}
          aria-label={runningHere ? `${t('stopTimer')} ${formatClock(elapsed)}` : t('startTimer')}
        >
          {runningHere ? <span className="tabular-nums">{formatClock(elapsed)}</span> : t('startTimer')}
        </Button>
      </div>

      {runningElsewhere ? <p className="mt-1 text-xs text-text-muted">{t('timerElsewhere')}</p> : null}

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
        <span className="inline-flex items-center gap-1.5 text-text-primary">
          <Clock className="h-3.5 w-3.5 text-text-muted" aria-hidden />
          <span className="font-medium tabular-nums">{dur(liveSeconds)}</span>
          <span className="text-text-secondary">{t('timeLoggedSuffix')}</span>
        </span>
        {progress.hasEstimate ? (
          <span className={`text-xs tabular-nums ${progress.over ? 'font-medium text-danger' : 'text-text-secondary'}`}>
            {progress.over
              ? t('timeOverEstimate', { time: dur(progress.overBy) })
              : t('timeOfEstimate', { estimate: dur(Math.round((task.estimated_hours || 0) * 3600)) })}
          </span>
        ) : null}
      </div>

      {progress.hasEstimate ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          aria-label={t('timeSection')}
          className="mt-1.5 h-1 overflow-hidden rounded-full bg-tertiary"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${progress.over ? 'bg-danger' : 'bg-primary'}`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      ) : null}

      {loadFailed ? (
        <p role="alert" className="mt-2 flex items-center justify-between gap-3 text-xs text-danger">
          <span>{t('timeLoadFailed')}</span>
          <button type="button" onClick={load} className="shrink-0 font-medium underline underline-offset-2">
            {t('retry')}
          </button>
        </p>
      ) : null}

      {loaded && !loadFailed && entries.length === 0 ? (
        <p className="mt-2 text-sm text-text-secondary">{t('timeNoEntries')}</p>
      ) : null}

      {visibleEntries.length > 0 ? (
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
          {visibleEntries.map((entry) => {
            const day = dayKey(entry.date)
            const mine = entry.user_id === currentUserId
            const who = mine ? t('you') : entry.user?.username || t('unknownUser')
            return (
              <li key={entry.id} className="flex items-center gap-2 py-1 pl-3 pr-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">
                    <span className="tabular-nums">
                      {day ? format.dateTime(parseDayKey(day), { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <span className="text-text-muted"> · </span>
                    <span className="text-text-secondary">{who}</span>
                  </p>
                  {entry.description ? (
                    <p className="truncate text-xs text-text-muted">{entry.description}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-text-primary">{dur(entry.duration)}</span>
                {mine ? (
                  <button
                    type="button"
                    aria-label={t('deleteTimeEntry')}
                    onClick={() => removeEntry(entry)}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger/10 hover:text-danger active:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-9 sm:w-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="h-9 w-3 shrink-0" aria-hidden />
                )}
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className="mt-1 flex flex-wrap items-center gap-x-3">
        <Button type="button" size="sm" variant="ghost" leftIcon={<Plus />} onClick={() => setDialogOpen(true)}>
          {t('addTimeManually')}
        </Button>
        {entries.length > COLLAPSED_COUNT ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
            className="inline-flex h-10 items-center rounded-md px-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-8"
          >
            {expanded ? t('timeShowLess') : t('timeShowAll', { count: entries.length })}
          </button>
        ) : null}
      </div>

      <ManualTimeDialog
        open={dialogOpen}
        task={task}
        workspaceId={workspaceId}
        onClose={() => setDialogOpen(false)}
        onAdded={() => {
          setDialogOpen(false)
          toast.success(t('timeAdded'))
          load()
        }}
      />
      {dialog}
    </section>
  )
}

function ManualTimeDialog({
  open,
  task,
  workspaceId,
  onClose,
  onAdded,
}: {
  open: boolean
  task: Task
  workspaceId: string
  onClose: () => void
  onAdded: () => void
}) {
  const t = useTranslations('pages.tasks')
  const [duration, setDuration] = useState('')
  const [date, setDate] = useState(() => localDateString())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDuration('')
    setDate(localDateString())
    setNote('')
    setError('')
    setSaving(false)
  }, [open])

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (saving) return
    const seconds = parseDuration(duration)
    if (!seconds) {
      setError(t('timeInvalidDuration'))
      return
    }
    if (!date) {
      setError(t('timeInvalidDate'))
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
          task_id: task.id,
          project_id: task.project_id || null,
          duration: seconds,
          date,
          description: note.trim() || null,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || t('timeAddFailed'))
      }
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('timeAddFailed'))
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      size="sm"
      title={t('addTimeManually')}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button type="submit" form="manual-time-form" className="flex-1" loading={saving}>
            {t('timeAdd')}
          </Button>
        </div>
      }
    >
      <form id="manual-time-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('timeDuration')} hint={t('timeDurationHint')} error={error || undefined} required>
          <Input
            value={duration}
            onChange={(event) => {
              setDuration(event.target.value)
              if (error) setError('')
            }}
            placeholder="1h 30m"
            autoComplete="off"
            enterKeyHint="done"
            data-autofocus
          />
        </Field>
        <Field label={t('timeDate')}>
          <Input type="date" value={date} max={localDateString()} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label={t('timeNote')} optional>
          <Input value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} autoComplete="off" />
        </Field>
      </form>
    </Dialog>
  )
}
