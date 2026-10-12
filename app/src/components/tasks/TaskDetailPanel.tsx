'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Link2, MessageSquare, Paperclip, Repeat, Trash2, Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { IconMenu } from '@/components/ui/IconMenu'
import RecurrenceSelector from './RecurrenceSelector'
import DependencySelector from './DependencySelector'
import CommentThread from './CommentThread'
import {
  PRIORITIES,
  PRIORITY_TONE,
  STATUSES,
  STATUS_DOT,
  dayKey,
  isDone,
  isOverdue,
  priorityLabel,
  statusLabel,
  todayKey,
} from './taskUtils'
import type { MemberOption, Priority, ProjectOption, Task } from './types'

interface TaskDetailPanelProps {
  task: Task
  workspaceId: string
  projects: ProjectOption[]
  members: MemberOption[]
  currentUserId: string
  /** Called with the merged task right after every edit (optimistic). */
  onChange: (task: Task) => void
  onDelete: (taskId: string) => void
  onClose: () => void
}

type Tab = 'comments' | 'links' | 'files' | 'repeat'

const controlBase =
  'h-9 min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-sm text-text-primary transition-colors hover:border-border hover:bg-surface-hover focus:border-primary focus:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
const control = `${controlBase} w-full`

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-[2.25rem] grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
      <label htmlFor={htmlFor} className="truncate text-xs font-medium text-text-muted">
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function parseRecurrence(value: unknown) {
  if (!value) return null
  try {
    return typeof value === 'string' ? JSON.parse(value) : (value as any)
  } catch {
    return null
  }
}

export default function TaskDetailPanel({
  task,
  workspaceId,
  projects,
  members,
  currentUserId,
  onChange,
  onDelete,
  onClose,
}: TaskDetailPanelProps) {
  const t = useTranslations('pages.tasks')
  const { confirm, dialog } = useConfirm()
  const uid = useId()
  const done = isDone(task)
  const overdue = isOverdue(task)

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [category, setCategory] = useState(task.category || '')
  const [estimate, setEstimate] = useState(task.estimated_hours ? String(task.estimated_hours) : '')
  const [tags, setTags] = useState((task.tags || []).join(', '))
  const [tab, setTab] = useState<Tab>('comments')
  const [error, setError] = useState('')
  const [dependencies, setDependencies] = useState<string[]>([])
  const [recurrence, setRecurrence] = useState<any>(() => parseRecurrence(task.recurrence_pattern))
  const [attachments, setAttachments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  const titleRef = useRef<HTMLTextAreaElement>(null)
  const taskRef = useRef(task)
  taskRef.current = task
  const recurrenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRecurrence = useRef<{ value: string | null } | null>(null)

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  const save = useCallback(
    async (patch: Record<string, unknown>, local: Partial<Task> = {}) => {
      const previous = taskRef.current
      onChange({ ...previous, ...patch, ...local } as Task)
      setError('')
      try {
        const response = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: previous.id, ...patch }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || t('updateTaskFailed'))
        }
      } catch (err) {
        onChange(previous)
        setError(err instanceof Error ? err.message : t('saveTaskFailed'))
      }
    },
    [onChange, t]
  )

  // Dependencies live in their own table
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error: loadError } = await supabase
          .from('task_dependencies')
          .select('depends_on_task_id')
          .eq('task_id', task.id)
        if (!cancelled && !loadError && data) setDependencies(data.map((d) => d.depends_on_task_id))
      } catch {
        // dependencies are optional
      }
    })()
    return () => {
      cancelled = true
    }
  }, [task.id])

  const persistDependencies = async (ids: string[]) => {
    setDependencies(ids)
    try {
      await supabase.from('task_dependencies').delete().eq('task_id', task.id)
      if (ids.length > 0) {
        const { error: insertError } = await supabase
          .from('task_dependencies')
          .insert(ids.map((id) => ({ task_id: task.id, depends_on_task_id: id })))
        if (insertError) throw insertError
      }
    } catch {
      setError(t('saveTaskFailed'))
    }
  }

  // Recurrence is saved shortly after the last edit (and flushed on close)
  const flushRecurrence = useCallback(() => {
    if (recurrenceTimer.current) clearTimeout(recurrenceTimer.current)
    recurrenceTimer.current = null
    const pending = pendingRecurrence.current
    pendingRecurrence.current = null
    if (!pending) return
    fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskRef.current.id, recurrence_pattern: pending.value }),
    }).catch(() => {})
  }, [])

  useEffect(() => flushRecurrence, [flushRecurrence])

  const changeRecurrence = (pattern: any) => {
    setRecurrence(pattern)
    pendingRecurrence.current = { value: pattern ? JSON.stringify(pattern) : null }
    if (recurrenceTimer.current) clearTimeout(recurrenceTimer.current)
    recurrenceTimer.current = setTimeout(flushRecurrence, 600)
  }

  // Attachments
  const loadAttachments = useCallback(async () => {
    try {
      const params = new URLSearchParams({ workspace_id: workspaceId, task_id: task.id })
      const response = await fetch(`/api/attachments?${params.toString()}`)
      if (!response.ok) return
      const payload = await response.json()
      setAttachments(payload.attachments || [])
    } catch (err) {
      console.error('Error loading attachments:', err)
    }
  }, [task.id, workspaceId])

  useEffect(() => {
    if (tab === 'files') loadAttachments()
  }, [tab, loadAttachments])

  const uploadAttachment = async (file?: File | null) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('workspace_id', workspaceId)
      body.append('task_id', task.id)
      const response = await fetch('/api/attachments', { method: 'POST', body })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || t('uploadFailed'))
      setAttachments((prev) => [payload.attachment, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadFileFailed'))
    } finally {
      setUploading(false)
    }
  }

  const deleteAttachment = async (id: string) => {
    setError('')
    try {
      const response = await fetch('/api/attachments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || t('deleteFailed'))
      }
      setAttachments((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deleteFileFailed'))
    }
  }

  const deleteTask = async () => {
    if (!(await confirm({ title: t('confirmDeleteTask'), confirmLabel: t('deleteTask') }))) return
    try {
      const response = await fetch(`/api/tasks?id=${task.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(t('deleteTaskFailed'))
      onDelete(task.id)
    } catch {
      setError(t('deleteTaskFailed'))
    }
  }

  const toggleComplete = () => {
    const next = !done
    save(
      { is_completed: next },
      { is_completed: next, status: next ? 'Done' : task.status === 'Done' ? 'To Do' : task.status }
    )
  }

  const commitTitle = () => {
    const next = title.trim()
    if (!next) {
      setTitle(task.title)
      return
    }
    if (next !== task.title) save({ title: next })
    if (next !== title) setTitle(next)
  }

  const commitDescription = () => {
    const next = description.trim()
    if (next !== (task.description || '').trim()) save({ description: next || null })
  }

  const commitCategory = () => {
    const next = category.trim()
    if (next !== (task.category || '')) save({ category: next || null })
  }

  const commitEstimate = () => {
    const parsed = parseFloat(estimate)
    const next = Number.isFinite(parsed) && parsed > 0 ? parsed : null
    if (next !== (task.estimated_hours || null)) save({ estimated_hours: next })
    setEstimate(next ? String(next) : '')
  }

  const commitTags = () => {
    const next = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    if (next.join('|') !== (task.tags || []).join('|')) save({ tags: next })
  }

  const dueValue = dayKey(task.due_date) || ''
  const setDue = (value: string) => save({ due_date: value || null })

  const tabs: { id: Tab; label: string; icon: typeof Link2 }[] = [
    { id: 'comments', label: t('comments'), icon: MessageSquare },
    { id: 'links', label: t('dependencies'), icon: Link2 },
    { id: 'files', label: t('files'), icon: Paperclip },
    { id: 'repeat', label: t('recurrence'), icon: Repeat },
  ]

  return (
    <div data-task-panel className="flex h-full min-h-0 flex-1 flex-col bg-surface">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={toggleComplete}
          className={`gap-1.5 ${done ? 'border-success/40 text-success' : ''}`}
        >
          <Check className="h-4 w-4" />
          {done ? t('reopen') : t('markComplete')}
        </Button>
        <span className="flex-1" />
        <IconMenu label={t('manage')} items={[{ label: t('deleteTask'), onClick: deleteTask, danger: true }]} />
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 px-4 py-4 sm:px-5">
          {error ? (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <textarea
            ref={titleRef}
            rows={1}
            value={title}
            aria-label={t('taskTitle')}
            placeholder={t('enterTaskTitle')}
            onChange={(event) => setTitle(event.target.value.replace(/\n/g, ' '))}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
            className={`block w-full resize-none overflow-hidden rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-semibold leading-snug tracking-tight transition-colors hover:border-border focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              done ? 'text-text-muted line-through' : 'text-text-primary'
            }`}
          />

          <div className="space-y-0.5">
            <Field label={t('status')} htmlFor={`${uid}-status`}>
              <div className="relative">
                <span
                  aria-hidden
                  className={`pointer-events-none absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${
                    STATUS_DOT[task.status] || 'bg-text-muted'
                  }`}
                />
                <select
                  id={`${uid}-status`}
                  value={task.status}
                  onChange={(event) => {
                    const status = event.target.value
                    save({ status }, { status, is_completed: status === 'Done' })
                  }}
                  className={`${control} pl-6`}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(t, status)}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label={t('assignee')} htmlFor={`${uid}-assignee`}>
              <select
                id={`${uid}-assignee`}
                value={task.assignee_id || ''}
                onChange={(event) => {
                  const id = event.target.value
                  const member = members.find((m) => m.id === id)
                  save(
                    { assignee_id: id },
                    { assignee_id: id, assignee: member ? { id: member.id, username: member.username } : null }
                  )
                }}
                className={control}
              >
                {!task.assignee_id ? (
                  <option value="" disabled>
                    {t('selectAssignee')}
                  </option>
                ) : null}
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.username}
                    {member.id === currentUserId ? ` (${t('you')})` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('dueDate')} htmlFor={`${uid}-due`}>
              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                <input
                  id={`${uid}-due`}
                  type="date"
                  value={dueValue}
                  onChange={(event) => setDue(event.target.value)}
                  className={`${controlBase} w-auto min-w-[9.5rem] ${overdue ? 'text-danger' : ''}`}
                />
                {dueValue !== todayKey() ? (
                  <button
                    type="button"
                    onClick={() => setDue(todayKey())}
                    className="rounded-md px-1.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t('today')}
                  </button>
                ) : null}
                {dueValue !== todayKey(1) ? (
                  <button
                    type="button"
                    onClick={() => setDue(todayKey(1))}
                    className="rounded-md px-1.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t('tomorrow')}
                  </button>
                ) : null}
                {dueValue ? (
                  <button
                    type="button"
                    onClick={() => setDue('')}
                    className="rounded-md px-1.5 py-1 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t('clear')}
                  </button>
                ) : null}
              </div>
            </Field>

            <Field label={t('priority')} htmlFor={`${uid}-priority`}>
              <div className="relative">
                <span
                  aria-hidden
                  className={`pointer-events-none absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${
                    PRIORITY_TONE[task.priority]?.dot || 'bg-text-muted'
                  }`}
                />
                <select
                  id={`${uid}-priority`}
                  value={task.priority}
                  onChange={(event) => save({ priority: event.target.value }, { priority: event.target.value as Priority })}
                  className={`${control} pl-6`}
                >
                  {[...PRIORITIES].reverse().map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabel(t, priority)}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label={t('project')} htmlFor={`${uid}-project`}>
              <select
                id={`${uid}-project`}
                value={task.project_id || ''}
                onChange={(event) => {
                  const id = event.target.value
                  if (!id) return
                  const project = projects.find((p) => p.id === id)
                  save(
                    { project_id: id },
                    { project_id: id, project: project ? { name: project.name, color: project.color || undefined } : null }
                  )
                }}
                className={control}
              >
                {!task.project_id ? (
                  <option value="" disabled>
                    {t('selectProject')}
                  </option>
                ) : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('estimatedHours')} htmlFor={`${uid}-estimate`}>
              <input
                id={`${uid}-estimate`}
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                value={estimate}
                placeholder="0.0"
                onChange={(event) => setEstimate(event.target.value)}
                onBlur={commitEstimate}
                className={`${controlBase} w-28`}
              />
            </Field>

            <Field label={t('category')} htmlFor={`${uid}-category`}>
              <input
                id={`${uid}-category`}
                type="text"
                value={category}
                placeholder={t('categoryExample')}
                onChange={(event) => setCategory(event.target.value)}
                onBlur={commitCategory}
                className={control}
              />
            </Field>

            <Field label={t('tags')} htmlFor={`${uid}-tags`}>
              <input
                id={`${uid}-tags`}
                type="text"
                value={tags}
                placeholder={t('tagsExample')}
                onChange={(event) => setTags(event.target.value)}
                onBlur={commitTags}
                className={control}
              />
            </Field>
          </div>

          <div>
            <label htmlFor={`${uid}-description`} className="mb-1.5 block text-xs font-medium text-text-muted">
              {t('description')}
            </label>
            <textarea
              id={`${uid}-description`}
              rows={5}
              value={description}
              placeholder={t('enterTaskDescription')}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={commitDescription}
              className="w-full resize-y rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>

          <div>
            <div role="tablist" className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-border px-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    tab === id
                      ? 'border-primary text-text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {tab === 'comments' ? (
              currentUserId ? (
                <CommentThread taskId={task.id} currentUserId={currentUserId} />
              ) : null
            ) : null}

            {tab === 'links' ? (
              <DependencySelector
                taskId={task.id}
                projectId={task.project_id || undefined}
                workspaceId={workspaceId}
                selectedDependencies={dependencies}
                onChange={persistDependencies}
              />
            ) : null}

            {tab === 'repeat' ? <RecurrenceSelector value={recurrence} onChange={changeRecurrence} /> : null}

            {tab === 'files' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 text-xs text-text-secondary">{t('taskFilesHelp')}</p>
                  <label
                    className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text-primary transition-colors focus-within:ring-2 focus-within:ring-primary ${
                      uploading ? 'pointer-events-none opacity-60' : 'hover:bg-surface-hover'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    {t('upload')}
                    <input
                      type="file"
                      className="sr-only"
                      disabled={uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) uploadAttachment(file)
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
                {attachments.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-secondary">
                    {t('noAttachments')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {attachments.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-tertiary px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Paperclip className="h-4 w-4 shrink-0 text-text-muted" />
                          <div className="min-w-0">
                            {file.url ? (
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate text-sm text-text-primary hover:underline"
                              >
                                {file.file_name}
                              </a>
                            ) : (
                              <p className="truncate text-sm text-text-primary">{file.file_name}</p>
                            )}
                            <p className="text-xs text-text-muted">{formatBytes(file.file_size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={t('delete')}
                          onClick={() => deleteAttachment(file.id)}
                          disabled={uploading}
                          className="shrink-0 rounded-lg p-2 text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {dialog}
    </div>
  )
}
