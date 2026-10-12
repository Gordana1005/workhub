'use client'

import { useId, useState, type ReactNode } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { CalendarDays, ChevronDown, ChevronRight, Folder, Plus, X } from 'lucide-react'
import { PickerMenu, type PickerOption } from '@/components/ui/PickerMenu'
import AssigneePicker from './AssigneePicker'
import {
  PRIORITIES,
  PRIORITY_TONE,
  STATUSES,
  STATUS_DOT,
  dayKey,
  isOverdue,
  parseDayKey,
  priorityLabel,
  statusLabel,
  todayKey,
} from './taskUtils'
import type { MemberOption, Priority, ProjectOption, Task } from './types'

export type SavePatch = (patch: Record<string, unknown>, local?: Partial<Task>) => void

const rowTrigger =
  'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left text-sm text-text-primary transition-colors hover:bg-surface-hover active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
const chipTrigger =
  'inline-flex h-10 max-w-[14rem] shrink-0 items-center gap-2 rounded-full border border-border-strong bg-surface px-3 text-sm font-medium text-text-primary transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

const dot = (className: string) => <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${className}`} />

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-h-9 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2">
      <span className="truncate px-1 text-xs font-medium text-text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/**
 * The always-visible properties of a task: assignee, status, priority, due date, project.
 * `sidebar` = labelled rows (desktop split view), `chips` = pills for a horizontally scrolling strip.
 */
export function TaskProperties({
  task,
  members,
  projects,
  currentUserId,
  assigneeCounts,
  onSave,
  variant,
}: {
  task: Task
  members: MemberOption[]
  projects: ProjectOption[]
  currentUserId: string
  assigneeCounts?: Record<string, number>
  onSave: SavePatch
  variant: 'sidebar' | 'chips'
}) {
  const t = useTranslations('pages.tasks')
  const format = useFormatter()
  const sidebar = variant === 'sidebar'
  const trigger = sidebar ? rowTrigger : chipTrigger

  const due = dayKey(task.due_date)
  const overdue = isOverdue(task)
  const formatDay = (key: string) => format.dateTime(parseDayKey(key), { month: 'short', day: 'numeric', year: parseDayKey(key).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
  const dueText = due
    ? due === todayKey()
      ? t('today')
      : due === todayKey(1)
        ? t('tomorrow')
        : formatDay(due)
    : t('noDueDate')

  const statusOptions: PickerOption[] = STATUSES.map((status) => ({
    id: status,
    label: statusLabel(t, status),
    icon: dot(STATUS_DOT[status] || 'bg-text-muted'),
  }))
  const priorityOptions: PickerOption[] = [...PRIORITIES].reverse().map((value) => ({
    id: value,
    label: priorityLabel(t, value),
    icon: dot(PRIORITY_TONE[value].dot),
  }))
  const projectOptions: PickerOption[] = projects.map((project) => ({
    id: project.id,
    label: project.name,
    icon: (
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-text-muted"
        style={project.color ? { backgroundColor: project.color } : undefined}
      />
    ),
  }))

  const setDue = (value: string) => onSave({ due_date: value || null })

  const assignee = (
    <AssigneePicker
      members={members}
      value={task.assignee_id || ''}
      currentUserId={currentUserId}
      counts={assigneeCounts}
      variant={sidebar ? 'field' : 'chip'}
      fallbackName={task.assignee?.username}
      onChange={(id) => {
        const member = members.find((m) => m.id === id)
        onSave(
          { assignee_id: id || null },
          { assignee_id: id || null, assignee: member ? { id: member.id, username: member.username } : null }
        )
      }}
    />
  )

  const status = (
    <PickerMenu
      title={t('status')}
      triggerLabel={`${t('status')}: ${statusLabel(t, task.status)}`}
      triggerClassName={trigger}
      options={statusOptions}
      value={task.status}
      onSelect={(next) => onSave({ status: next }, { status: next, is_completed: next === 'Done' })}
      width={220}
      align={sidebar ? 'end' : 'start'}
      trigger={
        <>
          {dot(STATUS_DOT[task.status] || 'bg-text-muted')}
          <span className="min-w-0 flex-1 truncate">{statusLabel(t, task.status)}</span>
        </>
      }
    />
  )

  const priority = (
    <PickerMenu
      title={t('priority')}
      triggerLabel={`${t('priority')}: ${priorityLabel(t, task.priority)}`}
      triggerClassName={trigger}
      options={priorityOptions}
      value={task.priority}
      onSelect={(next) => onSave({ priority: next }, { priority: next as Priority })}
      width={220}
      align={sidebar ? 'end' : 'start'}
      trigger={
        <>
          {dot(PRIORITY_TONE[task.priority]?.dot || 'bg-text-muted')}
          <span className="min-w-0 flex-1 truncate">{priorityLabel(t, task.priority)}</span>
        </>
      }
    />
  )

  const dueDate = (
    <PickerMenu
      title={t('dueDate')}
      triggerLabel={`${t('dueDate')}: ${dueText}`}
      triggerClassName={trigger}
      width={280}
      align={sidebar ? 'end' : 'start'}
      trigger={
        <>
          <CalendarDays className={`h-4 w-4 shrink-0 ${overdue ? 'text-danger' : 'text-text-muted'}`} aria-hidden />
          <span className={`min-w-0 flex-1 truncate tabular-nums ${overdue ? 'text-danger' : due ? '' : 'text-text-muted'}`}>
            {dueText}
          </span>
        </>
      }
    >
      {(close) => (
        <div className="space-y-3">
          <input
            type="date"
            aria-label={t('dueDate')}
            value={due || ''}
            onChange={(event) => {
              setDue(event.target.value)
              if (event.target.value) close()
            }}
            className="h-11 w-full rounded-lg border border-border bg-secondary px-3 text-base text-text-primary focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-9 sm:text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: t('today'), value: todayKey() },
              { label: t('tomorrow'), value: todayKey(1) },
              { label: t('nextWeek'), value: todayKey(7) },
              { label: t('clear'), value: '' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setDue(item.value)
                  close()
                }}
                disabled={!item.value && !due}
                className="h-11 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40 sm:h-9"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </PickerMenu>
  )

  const project = (
    <PickerMenu
      title={t('project')}
      triggerLabel={`${t('project')}: ${task.project?.name || t('selectProject')}`}
      triggerClassName={trigger}
      options={projectOptions}
      value={task.project_id || ''}
      onSelect={(id) => {
        if (!id) return
        const picked = projects.find((p) => p.id === id)
        onSave(
          { project_id: id },
          { project_id: id, project: picked ? { name: picked.name, color: picked.color || undefined } : null }
        )
      }}
      searchable
      searchPlaceholder={t('searchProjects')}
      emptyLabel={t('noProjectsFound')}
      width={288}
      align={sidebar ? 'end' : 'start'}
      trigger={
        <>
          {task.project?.color ? (
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: task.project.color }} />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          )}
          <span className={`min-w-0 flex-1 truncate ${task.project?.name ? '' : 'text-text-muted'}`}>
            {task.project?.name || t('selectProject')}
          </span>
        </>
      }
    />
  )

  if (sidebar) {
    return (
      <div className="space-y-0.5">
        <Row label={t('assignee')}>{assignee}</Row>
        <Row label={t('status')}>{status}</Row>
        <Row label={t('priority')}>{priority}</Row>
        <Row label={t('dueDate')}>{dueDate}</Row>
        <Row label={t('project')}>{project}</Row>
      </div>
    )
  }

  return (
    <>
      {assignee}
      {status}
      {priority}
      {dueDate}
      {project}
    </>
  )
}

const fieldClass =
  'h-11 w-full min-w-0 rounded-lg border border-border bg-secondary px-3 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-9 sm:text-sm'

/** Rarely used fields (estimate, category, labels) behind a disclosure. All autosave. */
export function TaskMoreDetails({ task, onSave }: { task: Task; onSave: SavePatch }) {
  const t = useTranslations('pages.tasks')
  const uid = useId()
  const [open, setOpen] = useState(false)
  const [estimate, setEstimate] = useState(task.estimated_hours ? String(task.estimated_hours) : '')
  const [category, setCategory] = useState(task.category || '')
  const [draft, setDraft] = useState('')
  const tags = task.tags || []

  const commitEstimate = () => {
    const parsed = parseFloat(estimate)
    const next = Number.isFinite(parsed) && parsed > 0 ? parsed : null
    if (next !== (task.estimated_hours || null)) onSave({ estimated_hours: next })
    setEstimate(next ? String(next) : '')
  }
  const commitCategory = () => {
    const next = category.trim()
    if (next !== (task.category || '')) onSave({ category: next || null })
  }
  const addTags = (raw: string) => {
    const incoming = raw
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag && !tags.includes(tag))
    setDraft('')
    if (incoming.length) onSave({ tags: [...tags, ...incoming] })
  }

  const filled = [task.estimated_hours, task.category, tags.length].filter(Boolean).length

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${uid}-more`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-full items-center gap-1.5 rounded-lg px-1 text-left text-xs font-semibold uppercase tracking-wide text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-8"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
        {t('moreDetails')}
        {filled > 0 && !open ? <span className="rounded-full bg-tertiary px-1.5 text-[11px] leading-5 tabular-nums">{filled}</span> : null}
      </button>
      {open ? (
        <div id={`${uid}-more`} className="mt-1 space-y-3">
          <div>
            <label htmlFor={`${uid}-estimate`} className="mb-1 block px-1 text-xs font-medium text-text-muted">
              {t('estimatedHours')}
            </label>
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
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-category`} className="mb-1 block px-1 text-xs font-medium text-text-muted">
              {t('category')}
            </label>
            <input
              id={`${uid}-category`}
              type="text"
              value={category}
              placeholder={t('categoryExample')}
              onChange={(event) => setCategory(event.target.value)}
              onBlur={commitCategory}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-tags`} className="mb-1 block px-1 text-xs font-medium text-text-muted">
              {t('tags')}
            </label>
            {tags.length > 0 ? (
              <ul className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="inline-flex h-8 max-w-full items-center gap-1 rounded-full bg-tertiary pl-3 pr-1 text-xs font-medium text-text-secondary"
                  >
                    <span className="min-w-0 truncate">{tag}</span>
                    <button
                      type="button"
                      aria-label={t('removeTag', { tag })}
                      onClick={() => onSave({ tags: tags.filter((item) => item !== tag) })}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-black/10 hover:text-text-primary active:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-white/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex items-center gap-2">
              <input
                id={`${uid}-tags`}
                type="text"
                value={draft}
                placeholder={t('addTagPlaceholder')}
                enterKeyHint="done"
                onChange={(event) => {
                  const value = event.target.value
                  if (value.includes(',')) addTags(value)
                  else setDraft(value)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addTags(draft)
                  }
                }}
                onBlur={() => addTags(draft)}
                className={fieldClass}
              />
              <button
                type="button"
                aria-label={t('addTag')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTags(draft)}
                disabled={!draft.trim()}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface text-text-secondary transition-colors hover:bg-surface-hover active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 sm:h-9 sm:w-9"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
