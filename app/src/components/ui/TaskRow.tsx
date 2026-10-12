'use client'

import { useRef, useState } from 'react'
import { Check } from 'lucide-react'

export function TaskRow({
  title,
  detail,
  done,
  completeLabel,
  deleteLabel,
  onOpen,
  onToggle,
  onDelete,
}: {
  title: string
  detail?: string
  done?: boolean
  completeLabel: string
  deleteLabel: string
  onOpen?: () => void
  onToggle?: () => void
  onDelete?: () => void
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

  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <div className="pointer-events-none absolute inset-0 flex text-xs font-medium" aria-hidden>
        <div className="flex w-1/2 items-center bg-primary/15 pl-4 text-primary">{completeLabel}</div>
        <div className="flex w-1/2 items-center justify-end bg-danger/15 pr-4 text-danger">{deleteLabel}</div>
      </div>
      <div
        className="relative flex items-center gap-3 bg-surface px-3 py-3"
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
          aria-label={completeLabel}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            done ? 'border-primary bg-primary text-white' : 'border-text-muted text-transparent hover:border-primary'
          }`}
          onClick={(event) => {
            event.stopPropagation()
            onToggle?.()
          }}
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className={`truncate text-sm font-medium ${done ? 'text-text-muted line-through' : 'text-text-primary'}`}>
            {title}
          </p>
          {detail ? <p className="truncate text-xs text-text-muted">{detail}</p> : null}
        </button>
      </div>
    </div>
  )
}
