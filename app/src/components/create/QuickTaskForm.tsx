'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import AssigneePicker from '@/components/tasks/AssigneePicker'
import { PRIORITIES, PRIORITY_TONE, fetchProjects, getWorkspaceMembers, priorityLabel } from '@/components/tasks/taskUtils'
import type { MemberOption, Priority, ProjectOption } from '@/components/tasks/types'

export interface QuickTaskInitial {
  title?: string
  description?: string
  priority?: Priority
  category?: string
  estimated_hours?: number
  tags?: string[]
  due_date?: string
  /** Titles of subtasks to create with the task (from a template). */
  subtasks?: string[]
}

interface QuickTaskFormProps {
  open: boolean
  onClose: () => void
  /** Pre-filled values (from a template, or a clicked calendar day). */
  initial?: QuickTaskInitial
  /** Project to preselect when it exists in the workspace. */
  defaultProjectId?: string
  onCreated?: (task: unknown) => void
}

const LAST_PROJECT_KEY = 'trackwork-last-project'

const fieldClass =
  'w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'

function apiError(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
    const message = (data as { error: string }).error
    if (message) return message
  }
  return fallback
}

function readLastProject() {
  try {
    return window.localStorage.getItem(LAST_PROJECT_KEY) || ''
  } catch {
    return ''
  }
}

export default function QuickTaskForm({ open, onClose, initial, defaultProjectId, onCreated }: QuickTaskFormProps) {
  const t = useTranslations('create')
  const tt = useTranslations('pages.tasks')
  const common = useTranslations('common')
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [showDescription, setShowDescription] = useState(false)
  const [priority, setPriority] = useState<Priority>('medium')
  const [who, setWho] = useState('me')
  const [when, setWhen] = useState('')
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [people, setPeople] = useState<MemberOption[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fallbackError = useRef(common('error'))
  fallbackError.current = common('error')
  const initialRef = useRef(initial)
  initialRef.current = initial
  const defaultProjectRef = useRef(defaultProjectId)
  defaultProjectRef.current = defaultProjectId
  const workspaceId = currentWorkspace?.id

  useEffect(() => {
    if (!open) return
    const seed = initialRef.current
    setTitle(seed?.title || '')
    setDescription(seed?.description || '')
    setShowDescription(!!seed?.description)
    setPriority(seed?.priority || 'medium')
    setWho('me')
    setWhen(seed?.due_date || '')
    setProjectId('')
    setProjects([])
    setPeople([])
    setUserId('')
    setSaving(false)
    setError(null)

    if (!workspaceId) return

    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        const [projectList, memberList, userRes] = await Promise.all([
          fetchProjects(workspaceId),
          getWorkspaceMembers(workspaceId, '').catch(() => [] as MemberOption[]),
          supabase.auth.getUser(),
        ])
        if (cancelled) return
        setUserId(userRes.data.user?.id ?? '')
        setProjects(projectList)
        setPeople(memberList)
        const preferred = [defaultProjectRef.current, readLastProject()].find(
          (id) => id && projectList.some((project) => project.id === id)
        )
        setProjectId(preferred || projectList[0]?.id || '')
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : fallbackError.current)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, workspaceId])

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    const workspace = currentWorkspace
    const trimmed = title.trim()
    if (!workspace || !trimmed || !projectId || saving || loading) return

    setSaving(true)
    setError(null)

    try {
      let assigneeId: string | null = null
      if (who === 'me') {
        assigneeId = userId || null
        if (!assigneeId) {
          const { data } = await supabase.auth.getUser()
          assigneeId = data.user?.id ?? null
        }
      } else if (who !== 'unassigned') {
        assigneeId = who
      }

      const seed = initialRef.current
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          project_id: projectId,
          title: trimmed,
          description: description.trim() || null,
          priority,
          assignee_id: assigneeId,
          due_date: when || null,
          category: seed?.category || null,
          estimated_hours: seed?.estimated_hours || null,
          tags: seed?.tags || [],
          ...(seed?.subtasks?.length ? { subtasks: seed.subtasks } : {}),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(apiError(data, common('error')))

      try {
        window.localStorage.setItem(LAST_PROJECT_KEY, projectId)
      } catch {
        // remembering the project is a convenience only
      }
      window.dispatchEvent(new CustomEvent('trackwork:task-created', { detail: data }))
      onCreated?.(data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : common('error'))
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || loading

  return (
    <Dialog
      open={open}
      title={t('task')}
      onClose={onClose}
      footer={
        currentWorkspace ? (
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="h-11 flex-1 sm:h-10" onClick={onClose} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              form="quick-task-form"
              className="h-11 flex-1 gap-2 sm:h-10"
              disabled={busy || !title.trim() || !projectId}
              aria-busy={busy}
            >
              {busy && (
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden
                />
              )}
              {busy ? common('loading') : t('save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      {!currentWorkspace ? (
        <p className="text-sm text-text-secondary">{t('needWorkspace')}</p>
      ) : (
        <form
          id="quick-task-form"
          className="space-y-4"
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) handleSubmit()
          }}
          noValidate
        >
          <div>
            <label htmlFor="quick-task-title" className="sr-only">
              {t('task')}
            </label>
            <input
              id="quick-task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('taskPlaceholder')}
              className={`${fieldClass} h-12 py-3 font-medium`}
              autoFocus
              autoComplete="off"
              enterKeyHint="done"
              disabled={saving}
              required
            />
            {showDescription ? (
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={tt('enterTaskDescription')}
                aria-label={tt('description')}
                className={`${fieldClass} mt-2 resize-y`}
                disabled={saving}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowDescription(true)}
                className="mt-1 inline-flex h-10 items-center rounded-md px-1 text-sm font-medium text-primary hover:underline active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {tt('addDescription')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="quick-task-project" className="mb-1.5 block text-xs font-medium text-text-secondary">
                {t('project')}
              </label>
              <select
                id="quick-task-project"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className={`${fieldClass} h-11`}
                disabled={busy || projects.length === 0}
                required
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quick-task-when" className="mb-1.5 block text-xs font-medium text-text-secondary">
                {t('when')}
              </label>
              <input
                id="quick-task-when"
                type="date"
                value={when}
                onChange={(event) => setWhen(event.target.value)}
                className={`${fieldClass} h-11`}
                disabled={saving}
              />
            </div>

            <div>
              <span id="quick-task-who-label" className="mb-1.5 block text-xs font-medium text-text-secondary">
                {t('who')}
              </span>
              <AssigneePicker
                variant="form"
                members={people}
                value={who === 'me' ? userId : who === 'unassigned' ? '' : who}
                currentUserId={userId}
                disabled={saving}
                onChange={(id) => setWho(id === '' ? 'unassigned' : id === userId ? 'me' : id)}
              />
            </div>

            <fieldset>
              <legend className="mb-1.5 block text-xs font-medium text-text-secondary">{tt('priority')}</legend>
              <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-tertiary p-0.5">
                {[...PRIORITIES].reverse().map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={priority === value}
                    disabled={saving}
                    onClick={() => setPriority(value)}
                    className={`flex h-11 min-w-0 items-center justify-center gap-1 rounded-md px-1 text-xs font-medium active:bg-surface-hover sm:h-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      priority === value
                        ? 'bg-surface text-text-primary shadow-sm'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_TONE[value].dot}`} aria-hidden />
                    <span className="truncate">{priorityLabel(tt, value)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </Dialog>
  )
}
