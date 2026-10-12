'use client'

/**
 * Dialog
 * ------
 * <Dialog open title onClose footer? size?='sm'|'md'|'lg'|'xl' description? closeOnBackdrop?=true>
 *   - portal, z-[80]; full-screen on phone (safe-area aware), centred rounded-2xl panel on sm+
 *   - 150ms enter/exit (opacity + translate), instant under prefers-reduced-motion
 *   - focus trap, initial focus (`data-autofocus` / autoFocus / first field; on touch devices the
 *     panel itself so the keyboard does not pop), focus restored to the opener on close
 *   - Escape closes only the TOPMOST dialog; body scroll lock is ref-counted for nesting
 *   - footer: right-aligned on sm+, stacked (primary on top) on phone
 *
 *
 * Confirmations live in ./ConfirmDialog (ConfirmDialog + useConfirm).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

// ---- shared modal plumbing (module scope so nested dialogs cooperate) ----
const stack: symbol[] = []
let lockCount = 0
let savedOverflow = ''

function lockScroll() {
  if (lockCount++ === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
}
function unlockScroll() {
  if (--lockCount <= 0) {
    lockCount = 0
    document.body.style.overflow = savedOverflow
  }
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('data-dialog-skip') && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)
  )
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const SIZE_CLASS = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
} as const

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  description,
  closeOnBackdrop = true,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  description?: string
  closeOnBackdrop?: boolean
}) {
  const t = useTranslations('common')
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Remember who opened us during render, i.e. BEFORE React's autoFocus runs in the commit.
  const openerRef = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  if (typeof document !== 'undefined') {
    if (open && !wasOpen.current) openerRef.current = document.activeElement as HTMLElement | null
    wasOpen.current = open
  }

  const [mounted, setMounted] = useState(false)
  const [present, setPresent] = useState(open) // stays true during the exit animation
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (open) {
      setPresent(true)
      return
    }
    if (!present) return
    if (prefersReducedMotion()) {
      setPresent(false)
      return
    }
    const timer = window.setTimeout(() => setPresent(false), 150)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const visible = mounted && (open || present)

  // Escape / scroll lock / focus management: tied to `open`, released the moment it closes.
  useEffect(() => {
    if (!open || !mounted) return
    const id = Symbol('dialog')
    stack.push(id)
    lockScroll()

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (stack[stack.length - 1] !== id) return
      event.stopPropagation()
      onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)

    // initial focus (after paint so the portal content exists)
    const raf = window.requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel || panel.contains(document.activeElement)) return
      const coarse = window.matchMedia?.('(pointer: coarse)').matches
      const marked = panel.querySelector<HTMLElement>('[data-autofocus]')
      const body = panel.querySelector<HTMLElement>('[data-dialog-body]')
      const first = coarse ? null : focusables(body)[0]
      ;(marked ?? first ?? panel).focus({ preventScroll: true })
    })

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      const index = stack.indexOf(id)
      if (index >= 0) stack.splice(index, 1)
      unlockScroll()
      const opener = openerRef.current
      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus({ preventScroll: true })
      }
    }
  }, [open, mounted])

  if (!visible) return null

  const closing = !open

  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel || !panel.contains(event.target as Node)) return // event came from a nested portal
    const items = focusables(panel)
    if (items.length === 0) {
      event.preventDefault()
      panel.focus()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] flex items-end justify-center bg-[rgb(var(--rgb-overlay)/0.55)] backdrop-blur-[2px] sm:items-center sm:p-6 ${
        closing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onCloseRef.current()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
        className={`relative flex h-[100dvh] w-full flex-col overflow-hidden bg-surface text-text-primary shadow-xl outline-none sm:h-auto sm:max-h-[min(88dvh,860px)] sm:rounded-2xl sm:border sm:border-border ${
          SIZE_CLASS[size] ?? SIZE_CLASS.md
        } ${closing ? 'animate-dialog-out' : 'animate-dialog-in'}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-4">
          <div className="min-w-0 self-center">
            <h2 id={titleId} className="truncate text-base font-semibold leading-6 tracking-tight">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-0.5 text-sm text-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label={t('close')}
            className="-mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:-mr-1.5 sm:h-8 sm:w-8"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          data-dialog-body
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
        >
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
