'use client'

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { CalendarDays, Check, CircleSlash, Plus, Trash2 } from 'lucide-react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { IconMenu } from '@/components/ui/IconMenu'
import { useToast } from '@/components/ui/Toast'
import { subtaskProgress } from '@/lib/subtasks'
import AssigneePicker from './AssigneePicker'
import { dayKey, isDone, parseDayKey, todayKey } from './taskUtils'
import type { MemberOption } from './types'

interface SubItem {
  id: string
  title: string
  done: boolean
  due: string | null
  assigneeId: string
  assigneeName: string
  pending?: boolean
}

interface SubtaskListProps {
  taskId: string
  workspaceId: string
  members: MemberOption[]
  currentUserId: string
  /** The parent task is already completed (no "complete the task?" prompt then). */
  parentDone: boolean
  /** Counts the parent currently carries (so the list only reports real changes). */
  knownTotal?: number
  knownDone?: number
  onCounts: (total: number, done: number) => void
  onCompleteParent: () => void
}

function fromRow(row: any): SubItem {
  const assignee = Array.isArray(row?.assignee) ? row.assignee[0] : row?.assignee
  return {
    id: row.id,
    title: row.title || '',
    done: isDone(row),
    due: dayKey(row.due_date),
    assigneeId: row.assignee_id || '',
    assigneeName: assignee?.username || '',
  }
}

/** Pasted checklist lines ("- [ ] a", "* b", "1. c") become one subtask each. */
function splitPasted(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*+]\s*(?:\[[ xX]\]\s*)?|\d+[.)]\s+)/, '').trim())
    .filter(Boolean)
}

const rowButton =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-9 sm:w-9'

async function patchSubtask(id: string, body: Record<string, unknown>) {
  const response = await fetch('/api/tasks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...body }),
  })
  if (!response.ok) throw new Error('update failed')
}

function SubtaskRow({
  item,
  members,
  currentUserId,
  onToggle,
  onTitle,
  onDue,
  onAssignee,
  onDelete,
}: {
  item: SubItem
  members: MemberOption[]
  currentUserId: string
  onToggle: () => void
  onTitle: (title: string) => void
  onDue: (due: string | null) => void
  onAssignee: (assigneeId: string) => void
  onDelete: () => void
}) {
  const t = useTranslations('pages.tasks')
  const format = useFormatter()
  const [draft, setDraft] = useState(item.title)
  useEffect(() => setDraft(item.title), [item.title])

  const overdue = !!item.due && !item.done && item.due < todayKey()
  const dueText = item.due ? format.dateTime(parseDayKey(item.due), { month: 'short', day: 'numeric' }) : ''
  const hasMeta = !!item.due || !!item.assigneeId

  const commit = () => {
    const next = draft.trim()
    if (!next) {
      setDraft(item.title)
      return
    }
    if (next !== item.title) onTitle(next)
    if (next !== draft) setDraft(next)
  }

  // On phones the due date / assignee controls sit on a second line (shown when set or while the row has focus);
  // from sm up they share the title's line and show on hover.
  const metaVisibility = hasMeta
    ? 'flex'
    : 'hidden group-focus-within:flex sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(hover:none)]:sm:opacity-100'

  return (
    <li
      className={`group flex flex-wrap items-center rounded-lg transition-colors hover:bg-surface-hover/60 focus-within:bg-surface-hover/60 ${
        item.pending ? 'opacity-60' : ''
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.done ? t('reopen') : t('markComplete')}
        disabled={item.pending}
        onClick={onToggle}
        className="group/check flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-9 sm:w-9"
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
            item.done
              ? 'border-success bg-success text-white'
              : 'border-text-muted text-transparent group-hover/check:border-success'
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
      </button>

      <input
        type="text"
        value={draft}
        aria-label={t('subtaskTitle')}
        disabled={item.pending}
        maxLength={200}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            setDraft(item.title)
            event.currentTarget.blur()
          }
        }}
        className={`h-11 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-base focus:border-border focus:bg-secondary focus:outline-none sm:h-9 sm:text-sm ${
          item.done ? 'text-text-muted line-through' : 'text-text-primary'
        }`}
      />

      <div
        className={`order-last basis-full items-center gap-1 pb-1 pl-11 sm:order-none sm:basis-auto sm:pb-0 sm:pl-0 ${metaVisibility}`}
      >
        <label
          className={`relative inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs transition-colors focus-within:ring-2 focus-within:ring-primary ${
            item.due
              ? overdue
                ? 'border-danger/30 bg-danger/10 font-medium text-danger'
                : 'border-border bg-tertiary text-text-secondary'
              : 'border-dashed border-border-strong text-text-muted hover:bg-surface-hover'
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          <span className="tabular-nums">{dueText || t('subtaskNoDate')}</span>
          <input
            type="date"
            value={item.due || ''}
            aria-label={t('dueDate')}
            disabled={item.pending}
            onChange={(event) => onDue(event.target.value || null)}
            onClick={(event) => {
              try {
                event.currentTarget.showPicker?.()
              } catch {
                // some browsers only allow showPicker from a user gesture on the field itself
              }
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <AssigneePicker
          variant="compact"
          members={members}
          value={item.assigneeId}
          currentUserId={currentUserId}
          fallbackName={item.assigneeName}
          disabled={item.pending}
          onChange={onAssignee}
        />
      </div>

      <IconMenu
        label={`${t('subtaskActions')}: ${item.title}`}
        buttonClassName={`${rowButton} aria-expanded:bg-surface-hover`}
        items={[
          ...(item.due ? [{ label: t('clearDueDate'), icon: <CircleSlash />, onClick: () => onDue(null) }] : []),
          { label: t('deleteSubtask'), icon: <Trash2 />, onClick: onDelete, danger: true, separatorBefore: !!item.due },
        ]}
      />
    </li>
  )
}

/**
 * Subtasks section of the task detail panel: progress, rows (toggle, inline title, due date,
 * assignee, delete) and a quick-add field that keeps focus so Enter can add several in a row.
 * Subtasks are real tasks with `parent_task_id`; when the database does not support them yet the
 * section explains it and disables adding instead of failing.
 */
export default function SubtaskList({
  taskId,
  workspaceId,
  members,
  currentUserId,
  parentDone,
  knownTotal,
  knownDone,
  onCounts,
  onCompleteParent,
}: SubtaskListProps) {
  const t = useTranslations('pages.tasks')
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [items, setItems] = useState<SubItem[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [unsupported, setUnsupported] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const itemsRef = useRef<SubItem[] | null>(null)
  itemsRef.current = items
  const seq = useRef(0)
  const parentDoneRef = useRef(parentDone)
  parentDoneRef.current = parentDone
  const onCountsRef = useRef(onCounts)
  onCountsRef.current = onCounts
  const onCompleteParentRef = useRef(onCompleteParent)
  onCompleteParentRef.current = onCompleteParent

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      const params = new URLSearchParams({ workspace_id: workspaceId, parent_task_id: taskId })
      const response = await fetch(`/api/tasks?${params.toString()}`)
      if (!response.ok) throw new Error('load failed')
      const rows = await response.json()
      setItems(Array.isArray(rows) ? rows.map(fromRow) : [])
    } catch {
      setItems((prev) => prev ?? [])
      setLoadFailed(true)
    }
  }, [taskId, workspaceId])

  useEffect(() => {
    setItems(null)
    setUnsupported(false)
    load()
  }, [load])

  // Keep the parent's x/y chip in step with what is shown here
  const total = items?.length ?? 0
  const doneCount = items?.filter((item) => item.done).length ?? 0
  useEffect(() => {
    if (!items) return
    if (total !== (knownTotal ?? 0) || doneCount !== (knownDone ?? 0)) onCountsRef.current(total, doneCount)
  }, [items, total, doneCount, knownTotal, knownDone])

  const update = (id: string, patch: Partial<SubItem>) =>
    setItems((prev) => (prev ? prev.map((item) => (item.id === id ? { ...item, ...patch } : item)) : prev))

  const save = async (id: string, apiPatch: Record<string, unknown>, local: Partial<SubItem>, previous: Partial<SubItem>) => {
    update(id, local)
    try {
      await patchSubtask(id, apiPatch)
    } catch {
      update(id, previous)
      toast.error(t('subtaskUpdateFailed'))
    }
  }

  const addTitles = async (titles: string[]) => {
    for (const title of titles) {
      const tempId = `tmp-${++seq.current}`
      setItems((prev) => [
        ...(prev || []),
        { id: tempId, title, done: false, due: null, assigneeId: '', assigneeName: '', pending: true },
      ])
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace_id: workspaceId, parent_task_id: taskId, title }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok) {
          if (data?.code === 'subtasks_unsupported') setUnsupported(true)
          throw new Error(data?.error || 'create failed')
        }
        setItems((prev) => (prev ? prev.map((item) => (item.id === tempId ? fromRow(data) : item)) : prev))
      } catch {
        setItems((prev) => (prev ? prev.filter((item) => item.id !== tempId) : prev))
        toast.error(t('subtaskAddFailed'))
        break
      }
    }
  }

  const submit = () => {
    const title = draft.replace(/\s+/g, ' ').trim()
    if (!title || unsupported) return
    setDraft('')
    inputRef.current?.focus()
    addTitles([title])
  }

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text')
    if (!/\r?\n/.test(text) || unsupported) return
    const titles = splitPasted(text)
    if (titles.length < 2) return
    event.preventDefault()
    addTitles(titles.slice(0, 50))
  }

  const toggle = (item: SubItem) => {
    const next = !item.done
    save(item.id, { is_completed: next }, { done: next }, { done: item.done })
    // Finishing the last open subtask offers to finish the task itself
    if (next && !parentDoneRef.current) {
      const current = itemsRef.current || []
      const allDone = current.length > 0 && current.every((other) => (other.id === item.id ? true : other.done))
      if (allDone) {
        toast.show({
          title: t('allSubtasksDone'),
          tone: 'success',
          duration: 8000,
          action: { label: t('completeTask'), onClick: () => onCompleteParentRef.current() },
        })
      }
    }
  }

  const remove = async (item: SubItem) => {
    if (!(await confirm({ title: t('confirmDeleteSubtask'), confirmLabel: t('deleteSubtask') }))) return
    const before = itemsRef.current
    setItems((prev) => (prev ? prev.filter((other) => other.id !== item.id) : prev))
    try {
      const response = await fetch(`/api/tasks?id=${item.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('delete failed')
    } catch {
      setItems(before)
      toast.error(t('subtaskDeleteFailed'))
    }
  }

  const progress = subtaskProgress(total, doneCount)

  return (
    <section aria-label={t('subtasks')} className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary">{t('subtasks')}</h3>
        {progress.total > 0 ? (
          <span className="text-xs tabular-nums text-text-secondary" aria-hidden>
            {progress.done}/{progress.total}
          </span>
        ) : null}
      </div>

      {progress.total > 0 ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          aria-label={t('subtasksProgressLabel', { done: progress.done, total: progress.total })}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-tertiary"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${progress.complete ? 'bg-success' : 'bg-primary'}`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      ) : null}

      {loadFailed ? (
        <p role="alert" className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          <span>{t('subtasksLoadFailed')}</span>
          <button type="button" onClick={load} className="shrink-0 font-medium underline underline-offset-2">
            {t('retry')}
          </button>
        </p>
      ) : null}

      {items === null ? (
        <div className="mt-2 space-y-2" aria-busy="true">
          <div className="skeleton h-9 w-full" />
        </div>
      ) : items.length > 0 ? (
        <ul className="-mx-1 mt-1.5 space-y-0.5">
          {items.map((item) => (
            <SubtaskRow
              key={item.id}
              item={item}
              members={members}
              currentUserId={currentUserId}
              onToggle={() => toggle(item)}
              onTitle={(title) => save(item.id, { title }, { title }, { title: item.title })}
              onDue={(due) => save(item.id, { due_date: due }, { due }, { due: item.due })}
              onAssignee={(assigneeId) => {
                const member = members.find((m) => m.id === assigneeId)
                save(
                  item.id,
                  { assignee_id: assigneeId || null },
                  { assigneeId, assigneeName: member?.username || '' },
                  { assigneeId: item.assigneeId, assigneeName: item.assigneeName }
                )
              }}
              onDelete={() => remove(item)}
            />
          ))}
        </ul>
      ) : null}

      {unsupported ? (
        <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-text-secondary">
          {t('subtasksUnavailable')}
        </p>
      ) : (
        <div className="-mx-1 mt-0.5 flex items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center text-text-muted sm:h-9 sm:w-9" aria-hidden>
            <Plus className="h-4 w-4" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            maxLength={200}
            aria-label={t('addSubtask')}
            placeholder={items && items.length === 0 ? t('subtasksEmptyHint') : t('addSubtaskPlaceholder')}
            enterKeyHint="done"
            autoComplete="off"
            onChange={(event) => setDraft(event.target.value)}
            onPaste={onPaste}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault()
                submit()
              } else if (event.key === 'Escape' && draft) {
                event.preventDefault()
                event.stopPropagation()
                setDraft('')
              }
            }}
            className="h-11 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-base text-text-primary placeholder:text-text-muted hover:bg-surface-hover/60 focus:border-border focus:bg-secondary focus:outline-none sm:h-9 sm:text-sm"
          />
          {draft.trim() ? (
            <button type="button" aria-label={t('addSubtask')} onClick={submit} className={`${rowButton} text-primary`}>
              <Check className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      )}
      {dialog}
    </section>
  )
}
