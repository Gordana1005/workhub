'use client'

/**
 * Tooltip: label for icon-only controls (desktop hover/keyboard focus; never on touch).
 *   <Tooltip content="Archive" side?='top'|'bottom'><Button iconOnly aria-label="Archive">...</Button></Tooltip>
 * Child must be ONE element that accepts ref-less handlers (button/a/Button). Not a substitute for
 * aria-label: always label icon-only controls too. Portal + fixed, so never clipped; z-[75].
 */
import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

type Handlers = {
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseLeave?: (e: React.MouseEvent) => void
  onFocus?: (e: React.FocusEvent) => void
  onBlur?: (e: React.FocusEvent) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  'aria-describedby'?: string
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 350,
}: {
  content: ReactNode
  children: ReactElement<Handlers>
  side?: 'top' | 'bottom'
  delay?: number
}) {
  const id = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number>(0)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const show = useCallback(() => {
    if (window.matchMedia('(hover: none)').matches) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(true), delay)
  }, [delay])

  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setOpen(false)
    setPos(null)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useLayoutEffect(() => {
    if (!open) return
    const anchor = wrapRef.current?.firstElementChild ?? wrapRef.current
    const tip = tipRef.current
    if (!anchor || !tip) return
    const r = anchor.getBoundingClientRect()
    const w = tip.offsetWidth
    const h = tip.offsetHeight
    let top = side === 'top' ? r.top - h - 8 : r.bottom + 8
    if (top < 8) top = r.bottom + 8
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8)
    const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8))
    setPos({ top, left })
  }, [open, side, content])

  const child = children
  const merged = cloneElement(child, {
    'aria-describedby': open ? id : child.props['aria-describedby'],
    onMouseEnter: (e: React.MouseEvent) => {
      child.props.onMouseEnter?.(e)
      show()
    },
    onMouseLeave: (e: React.MouseEvent) => {
      child.props.onMouseLeave?.(e)
      hide()
    },
    onFocus: (e: React.FocusEvent) => {
      child.props.onFocus?.(e)
      // only keyboard focus: pointer focus is covered by hover
      if ((e.target as HTMLElement).matches?.(':focus-visible')) show()
    },
    onBlur: (e: React.FocusEvent) => {
      child.props.onBlur?.(e)
      hide()
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      child.props.onKeyDown?.(e)
      if (e.key === 'Escape') hide()
    },
  })

  return (
    <span ref={wrapRef} className="contents">
      {merged}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={tipRef}
              id={id}
              role="tooltip"
              style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
              className="pointer-events-none fixed z-[75] max-w-[16rem] animate-fade-in rounded-md bg-text-primary px-2 py-1 text-xs font-medium leading-4 text-background shadow-md"
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </span>
  )
}
