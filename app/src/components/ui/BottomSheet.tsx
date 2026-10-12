'use client'

/**
 * BottomSheet: modal sheet anchored to the bottom edge (centred, max-w-lg on sm+).
 *   <BottomSheet open onClose label="More" title?="More">{content}</BottomSheet>
 * - portal, z-[70] (above the header and tab bar, below dialogs); `raised` -> z-[90] for use inside dialogs.
 * - grab handle + swipe down to close (touch), tap the backdrop or press Escape to close.
 * - ref-counted scroll lock, focus moves into the sheet and returns to the opener on close.
 * - content scrolls inside (overscroll-contain), bottom padding respects the home-indicator safe area.
 * - when the on-screen keyboard opens the sheet stays above it (visual viewport aware).
 * Used by the phone More menu, account sheet, New menu and workspace switcher. For lists of actions
 * prefer <IconMenu>; for forms prefer <Dialog>.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import { focusables, lockScroll, revealFocused, unlockScroll } from './modalUtils'
import { useSheetDrag } from './useSheetDrag'

export function BottomSheet({
  open,
  onClose,
  label,
  title,
  children,
  raised = false,
  className = '',
}: {
  open: boolean
  onClose: () => void
  /** Accessible name (always required) */
  label: string
  /** Optional visible heading */
  title?: string
  children: ReactNode
  raised?: boolean
  className?: string
}) {
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const keyboard = useVisualViewport(open)
  const drag = useSheetDrag(() => onCloseRef.current())
  const resetDrag = drag.reset

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    resetDrag()
    const opener = document.activeElement as HTMLElement | null
    lockScroll()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
      } else if (event.key === 'Tab') {
        const panel = panelRef.current
        if (!panel) return
        const items = focusables(panel)
        if (items.length === 0) {
          event.preventDefault()
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
    }
    window.addEventListener('keydown', onKey)
    const raf = window.requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }))
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      unlockScroll()
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true })
    }
  }, [open, resetDrag])

  if (!open || !mounted) return null

  const z = raised ? 'z-[90]' : 'z-[70]'

  return createPortal(
    <div
      className={`fixed inset-0 ${z}`}
      style={keyboard ? { top: keyboard.top, bottom: 'auto', height: keyboard.height } : undefined}
    >
      <div aria-hidden className="absolute inset-0 animate-fade-in bg-[rgb(var(--rgb-overlay)/0.5)]" onClick={() => onCloseRef.current()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        data-sheet
        style={drag.style}
        onFocusCapture={(event) => {
          if (window.matchMedia?.('(pointer: coarse)').matches) revealFocused(event.target)
        }}
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(88%,calc(100%_-_env(safe-area-inset-top)_-_0.5rem))] w-full animate-sheet-in flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface-raised shadow-xl outline-none sm:max-w-lg ${className}`}
      >
        <div {...drag.handleProps} className="shrink-0">
          <div aria-hidden className="mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-border-strong" />
          {title ? <h2 className="px-5 pb-2 pt-1 text-base font-semibold tracking-tight text-text-primary">{title}</h2> : <div className="h-2" />}
        </div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 ${
            keyboard ? 'pb-4' : 'pb-[max(1rem,env(safe-area-inset-bottom))]'
          }`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
