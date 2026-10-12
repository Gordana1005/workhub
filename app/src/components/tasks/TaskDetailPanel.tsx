'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronLeft, ChevronRight, Circle, Copy, Link as LinkIcon, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { IconMenu } from '@/components/ui/IconMenu'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import RecurrenceSelector from './RecurrenceSelector'
import DependencySelector from './DependencySelector'
import CommentThread from './CommentThread'
import AttachmentsTab from './AttachmentsTab'
import SubtaskList from './SubtaskList'
import TaskTimeSection from './TaskTimeSection'
import { TaskMoreDetails, TaskProperties } from './TaskProperties'
import { dayKey, isDone } from './taskUtils'
import type { MemberOption, ProjectOption, Task } from './types'

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
  /** `auto` picks two columns when the panel is wide (>= 760px) and stacked otherwise. */
  layout?: 'auto' | 'split' | 'stacked'
  /** Open (not done) task count per assignee id, shown in the assignee picker. */
  assigneeCounts?: Record<string, number>
}

type Tab = 'comments' | 'links' | 'files' | 'repeat'
type SaveState = 'idle' | 'saving' | 'saved'

const iconButton =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-9 sm:w-9'

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
  layout = 'auto',
  assigneeCounts,
}: TaskDetailPanelProps) {
  const t = useTranslations('pages.tasks')
  const common = useTranslations('common')
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const uid = useId()
  const done = isDone(task)

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [tab, setTab] = useState<Tab>('comments')
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [dependencies, setDependencies] = useState<string[]>([])
  const [recurrence, setRecurrence] = useState<any>(() => parseRecurrence(task.recurrence_pattern))
  const [attachmentCount, setAttachmentCount] = useState<number | undefined>(undefined)
  const [commentCount, setCommentCount] = useState<number | undefined>(undefined)
  const [width, setWidth] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const taskRef = useRef(task)
  taskRef.current = task
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recurrenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRecurrence = useRef<{ value: string | null } | null>(null)

  const isPhone = useMediaQuery('(max-width: 639px)')

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width ?? 0))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const split = layout === 'split' || (layout === 'auto' && !isPhone && width >= 760)

  useEffect(() => {
    for (const el of [titleRef.current, descriptionRef.current]) {
      if (!el) continue
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [title, description, split, width])

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    []
  )

  const save = useCallback(
    async (patch: Record<string, unknown>, local: Partial<Task> = {}) => {
      const previous = taskRef.current
      onChange({ ...previous, ...patch, ...local } as Task)
      setError('')
      setSaveState('saving')
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
        setSaveState('saved')
        if (savedTimer.current) clearTimeout(savedTimer.current)
        savedTimer.current = setTimeout(() => setSaveState('idle'), 2200)
      } catch (err) {
        onChange(previous)
        setSaveState('idle')
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

  const duplicateTask = async () => {
    if (!task.project_id) {
      setError(t('selectProject'))
      return
    }
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          project_id: task.project_id,
          title: `${task.title} (${t('copySuffix')})`,
          description: task.description || null,
          priority: task.priority,
          due_date: dayKey(task.due_date),
          assignee_id: task.assignee_id || null,
          category: task.category || null,
          estimated_hours: task.estimated_hours || null,
          tags: task.tags || [],
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || t('saveTaskFailed'))
      window.dispatchEvent(new CustomEvent('trackwork:task-created', { detail: data }))
      toast.success(t('taskDuplicated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveTaskFailed'))
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/dashboard/tasks?task=${task.id}`)
      toast.success(t('linkCopied'))
    } catch {
      toast.error(t('linkCopyFailed'))
    }
  }

  const toggleComplete = () => {
    const next = !done
    save(
      { is_completed: next },
      { is_completed: next, status: next ? 'Done' : task.status === 'Done' ? 'To Do' : task.status }
    )
  }

  // Subtasks / time sections report their numbers so the lists behind the panel stay in step
  const handleSubtaskCounts = useCallback(
    (total: number, doneCount: number) => {
      onChange({ ...taskRef.current, subtask_total: total, subtask_done: doneCount })
    },
    [onChange]
  )

  const handleLoggedSeconds = useCallback(
    (seconds: number) => {
      if ((taskRef.current.logged_seconds || 0) === seconds) return
      onChange({ ...taskRef.current, logged_seconds: seconds })
    },
    [onChange]
  )

  const completeParent = useCallback(() => {
    if (isDone(taskRef.current)) return
    save({ is_completed: true }, { is_completed: true, status: 'Done' })
  }, [save])

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

  const tabs = [
    { id: 'comments', label: t('comments'), count: commentCount || undefined },
    { id: 'links', label: t('dependencies'), count: dependencies.length || undefined },
    { id: 'files', label: t('files'), count: attachmentCount || undefined },
    { id: 'repeat', label: t('recurrence') },
  ]

  const completeButton = (
    <button
      type="button"
      onClick={toggleComplete}
      aria-pressed={done}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-9 ${
        done
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-border-strong bg-surface text-text-primary hover:bg-surface-hover'
      }`}
    >
      {done ? (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : (
        <Circle className="h-5 w-5 text-text-muted" strokeWidth={1.75} />
      )}
      {done ? t('statusDone') : t('markDone')}
    </button>
  )

  const saveIndicator = (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex shrink-0 items-center gap-1 text-xs text-text-muted transition-opacity ${
        saveState === 'idle' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {saveState === 'saved' ? (
        <>
          <Check className="h-3.5 w-3.5 text-success" aria-hidden />
          {t('saved')}
        </>
      ) : saveState === 'saving' ? (
        t('saving')
      ) : null}
    </span>
  )

  const menu = (
    <IconMenu
      label={t('manage')}
      buttonClassName={`${iconButton} aria-expanded:bg-surface-hover`}
      items={[
        { label: t('duplicateTask'), icon: <Copy />, onClick: duplicateTask },
        { label: t('copyLink'), icon: <LinkIcon />, onClick: copyLink },
        { label: t('deleteTask'), icon: <Trash2 />, onClick: deleteTask, danger: true, separatorBefore: true },
      ]}
    />
  )

  const header = (
    <div
      className={`flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:px-4 ${
        isPhone ? 'pt-[max(0.5rem,env(safe-area-inset-top))]' : ''
      }`}
    >
      {isPhone ? (
        <button type="button" onClick={onClose} aria-label={common('back')} className={`${iconButton} -ml-1`}>
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : null}
      {completeButton}
      {!isPhone ? (
        <nav aria-label={common('breadcrumb')} className="flex min-w-0 flex-1 items-center gap-1 text-sm text-text-muted">
          {task.project?.name ? (
            <>
              <span className="min-w-0 max-w-[40%] truncate">{task.project.name}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </>
          ) : null}
          <span className="min-w-0 truncate text-text-secondary">{task.title}</span>
        </nav>
      ) : (
        <span className="flex-1" />
      )}
      {saveIndicator}
      {menu}
      {!isPhone ? (
        <button type="button" onClick={onClose} aria-label={t('close')} className={iconButton}>
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )

  const titleField = (
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
      className="-mx-2 block w-[calc(100%+1rem)] resize-none overflow-hidden break-words rounded-lg border border-transparent bg-transparent px-2 py-1 text-[22px] font-semibold leading-snug tracking-tight text-text-primary transition-colors placeholder:text-text-muted hover:bg-surface-hover/60 focus:border-border focus:bg-secondary focus:outline-none sm:text-2xl"
    />
  )

  const descriptionField = (
    <textarea
      ref={descriptionRef}
      id={`${uid}-description`}
      rows={2}
      value={description}
      aria-label={t('description')}
      placeholder={t('descriptionPlaceholder')}
      onChange={(event) => setDescription(event.target.value)}
      onBlur={commitDescription}
      className="-mx-2 block min-h-[4.5rem] w-[calc(100%+1rem)] resize-none overflow-hidden rounded-lg border border-transparent bg-transparent px-2 py-2 text-base leading-relaxed text-text-primary placeholder:text-text-muted hover:bg-surface-hover/60 focus:border-border focus:bg-secondary focus:outline-none sm:text-sm"
    />
  )

  const tabArea = (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <Tabs
        ariaLabel={t('details')}
        idPrefix={`${uid}-tt`}
        value={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={tabs}
      />
      <div
        role="tabpanel"
        aria-labelledby={`${uid}-tt-tab-${tab}`}
        className={`flex flex-1 flex-col ${tab === 'comments' ? 'pt-4' : 'py-4'}`}
      >
        {tab === 'comments' ? (
          currentUserId ? (
            <CommentThread
              key={task.id}
              taskId={task.id}
              currentUserId={currentUserId}
              members={members}
              workspaceId={workspaceId}
              onCount={setCommentCount}
            />
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

        <div hidden={tab !== 'files'}>
          <AttachmentsTab
            key={task.id}
            workspaceId={workspaceId}
            taskId={task.id}
            currentUserId={currentUserId}
            members={members}
            active={tab === 'files'}
            onCount={setAttachmentCount}
          />
        </div>
      </div>
    </div>
  )

  const errorBanner = error ? (
    <p role="alert" className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
      {error}
    </p>
  ) : null

  return (
    <div ref={rootRef} data-task-panel className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-surface">
      {header}

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex min-h-full flex-col px-4 pt-4 sm:px-6 sm:pt-5">
            {errorBanner}
            {titleField}

            {split ? null : (
              <div
                role="group"
                aria-label={t('properties')}
                className="scrollbar-hide -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 [-webkit-mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)] [mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)] sm:-mx-6 sm:px-6"
              >
                <TaskProperties
                  variant="chips"
                  task={task}
                  members={members}
                  projects={projects}
                  currentUserId={currentUserId}
                  assigneeCounts={assigneeCounts}
                  onSave={save}
                />
                <span aria-hidden className="w-4 shrink-0" />
              </div>
            )}

            <div className="mt-3">{descriptionField}</div>

            {task.parent_task_id ? null : (
              <SubtaskList
                key={task.id}
                taskId={task.id}
                workspaceId={workspaceId}
                members={members}
                currentUserId={currentUserId}
                parentDone={done}
                knownTotal={task.subtask_total}
                knownDone={task.subtask_done}
                onCounts={handleSubtaskCounts}
                onCompleteParent={completeParent}
              />
            )}

            <TaskTimeSection
              key={`time-${task.id}`}
              task={task}
              workspaceId={workspaceId}
              currentUserId={currentUserId}
              onLoggedSeconds={handleLoggedSeconds}
            />

            {split ? null : (
              <div className="mt-2">
                <TaskMoreDetails task={task} onSave={save} />
              </div>
            )}

            {tabArea}
          </div>
        </div>

        {split ? (
          <aside
            aria-label={t('properties')}
            className="scrollbar-thin hidden w-[320px] shrink-0 overflow-y-auto overscroll-contain border-l border-border bg-surface-hover/40 p-4 sm:block"
          >
            <TaskProperties
              variant="sidebar"
              task={task}
              members={members}
              projects={projects}
              currentUserId={currentUserId}
              assigneeCounts={assigneeCounts}
              onSave={save}
            />
            <div className="mt-4 border-t border-border pt-3">
              <TaskMoreDetails task={task} onSave={save} />
            </div>
          </aside>
        ) : null}
      </div>
      {dialog}
    </div>
  )
}
