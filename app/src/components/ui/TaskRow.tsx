'use client'

/**
 * TaskRow: <TaskRow title detail? done? completeLabel deleteLabel onOpen? onToggle? onDelete?
 *                   priority? priorityLabel? dueLabel? overdue? meta? actions? />
 * - Checkbox: animated tick, 40px hit area, role=checkbox.
 * - Phone: swipe right = complete, swipe left = delete (unchanged). Pointer devices get a hover
 *   delete button (and `actions`) instead.
 * - priority 'low'|'medium'|'high'|'urgent' + priorityLabel (already translated) -> tinted chip.
 * - dueLabel (already formatted) -> chip, red when `overdue`.
 * - meta: extra trailing node (avatar, badges); actions: extra hover-revealed controls.
 */
import { useRef, useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'

type Priority = 'low' | 'medium' | 'high' | 'urgent'

const priorityTone: Record<Priority, string> = {
  urgent: 'bg-danger/10 text-danger ring-danger/20',
  high: 'bg-warning/[0.14] text-warning ring-warning/25',
  medium: 'bg-primary/10 text-primary ring-primary/20',
  low: 'bg-tertiary text-text-secondary ring-border',
}

const chip = 'inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-px text-[11px] font-medium leading-4 ring-1 ring-inset'

export function TaskRow({
  title,
  detail,
  done,
  completeLabel,
  deleteLabel,
  onOpen,
  onToggle,
  onDelete,
  priority,
  priorityLabel,
  dueLabel,
  overdue,
  meta,
  actions,
}: {
  title: string
  detail?: string
  done?: boolean
  completeLabel: string
  deleteLabel: string
  onOpen?: () => void
  onToggle?: () => void
  onDelete?: () => void
  priority?: Priority
  priorityLabel?: string
  dueLabel?: string
  overdue?: boolean
  meta?: ReactNode
  actions?: ReactNode
}) {
  const startX = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const finish = (clientX: number) => {
    if (startX.current == null) return
    const dx = clientX - startX.current
    startX.current = null
    setDragging(false)
    setOffset(0)
    if (dx > 88 && onToggle) onToggle()
    else if (dx < -88 && onDelete) onDelete()
  }

  const hasChips = Boolean((priority && priorityLabel) || dueLabel)

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-colors hover:border-border-strong">
      <div className="pointer-events-none absolute inset-0 flex text-xs font-medium" aria-hidden>
        <div
          className={`flex w-1/2 items-center bg-primary/15 pl-4 text-primary transition-opacity ${
            offset > 0 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {completeLabel}
        </div>
        <div
          className={`flex w-1/2 items-center justify-end bg-danger/15 pr-4 text-danger transition-opacity ${
            offset < 0 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {deleteLabel}
        </div>
      </div>
      <div
        className="relative flex items-center gap-2 bg-surface py-1.5 pl-2 pr-3 transition-colors group-hover:bg-surface-hover/60"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 160ms ease',
          touchAction: 'pan-y',
        }}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse') return
          startX.current = event.clientX
          setDragging(true)
        }}
        onPointerMove={(event) => {
          if (startX.current == null) return
          const dx = event.clientX - startX.current
          if (Math.abs(dx) < 10) return
          setOffset(Math.max(-128, Math.min(128, dx)))
        }}
        onPointerUp={(event) => finish(event.clientX)}
        onPointerCancel={() => {
          startX.current = null
          setDragging(false)
          setOffset(0)
        }}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={Boolean(done)}
          aria-label={completeLabel}
          className="group/check flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={(event) => {
            event.stopPropagation()
            onToggle?.()
          }}
        >
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-[background-color,border-color,transform] duration-200 group-active/check:scale-90 ${
              done
                ? 'border-primary bg-primary text-white'
                : 'border-border-control text-transparent group-hover/check:border-primary'
            }`}
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden>
              <path
                d="M3.5 8.5l3 3 6-6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={done ? 0 : 1}
                style={{ transition: 'stroke-dashoffset 220ms ease-out 40ms' }}
              />
            </svg>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 rounded-md py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className={`truncate text-sm font-medium ${done ? 'text-text-muted line-through' : 'text-text-primary'}`}>
            {title}
          </p>
          {detail || hasChips ? (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {detail ? <span className="block max-w-full truncate text-xs text-text-muted">{detail}</span> : null}
              {priority && priorityLabel ? (
                <span className={`${chip} ${priorityTone[priority]}`}>{priorityLabel}</span>
              ) : null}
              {dueLabel ? (
                <span
                  className={`${chip} tabular-nums ${
                    overdue && !done ? 'bg-danger/10 text-danger ring-danger/20' : 'bg-tertiary text-text-secondary ring-border'
                  }`}
                >
                  {dueLabel}
                </span>
              ) : null}
            </span>
          ) : null}
        </button>
        {meta ? <div className="flex shrink-0 items-center gap-2">{meta}</div> : null}
        {actions || onDelete ? (
          <div className="flex shrink-0 items-center gap-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:transition-opacity [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
            {actions}
            {onDelete ? (
              <button
                type="button"
                aria-label={deleteLabel}
                title={deleteLabel}
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete()
                }}
                className="hidden h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger [@media(hover:hover)]:inline-flex"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
