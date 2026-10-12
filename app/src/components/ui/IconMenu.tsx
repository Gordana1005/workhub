'use client'

/**
 * IconMenu: "more actions" menu.
 *   <IconMenu label="Actions" items={[{ label, onClick, danger?, icon?, disabled?, separatorBefore? }]}
 *             align?='end'|'start' trigger?={<Icon/>} buttonClassName? />
 * - portal + position:fixed, so overflow-hidden parents never clip it; flips above/below and
 *   clamps left/right inside the viewport; follows scroll/resize while open.
 * - keyboard: Enter/Space/ArrowDown/ArrowUp open, arrows/Home/End/typeahead move, Esc closes and
 *   returns focus to the trigger, Tab closes.
 * - phone (<640px): bottom sheet with 48px rows; sm+: compact popover with 36px rows.
 * - z-[70] (above the app header, below dialogs); auto-raised to z-[90] inside a dialog.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'

export type IconMenuItem = {
  label: string
  onClick: () => void
  danger?: boolean
  icon?: ReactNode
  disabled?: boolean
  separatorBefore?: boolean
}

const MARGIN = 8

export function IconMenu({
  label,
  items,
  align = 'end',
  trigger,
  buttonClassName,
}: {
  label: string
  items: IconMenuItem[]
  align?: 'start' | 'end'
  trigger?: ReactNode
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [raised, setRaised] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; origin: string } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const typeahead = useRef({ text: '', timer: 0 })
  const menuId = useId()

  const enabledItems = useCallback(
    () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []),
    []
  )

  const close = useCallback((returnFocus = true) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const openMenu = useCallback((focus: 'first' | 'last' = 'first') => {
    const el = triggerRef.current
    setSheet(window.matchMedia('(max-width: 639px)').matches)
    setRaised(Boolean(el?.closest('[role="dialog"]')))
    setPos(null)
    setOpen(true)
    window.requestAnimationFrame(() => {
      const list = enabledItems()
      ;(focus === 'last' ? list[list.length - 1] : list[0])?.focus({ preventScroll: true })
    })
  }, [enabledItems])

  const place = useCallback(() => {
    const trig = triggerRef.current
    const menu = menuRef.current
    if (!trig || !menu) return
    const r = trig.getBoundingClientRect()
    const w = menu.offsetWidth
    const h = menu.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    const below = vh - r.bottom - MARGIN
    const above = r.top - MARGIN
    const openUp = h > below && above > below
    let top = openUp ? r.top - h - 4 : r.bottom + 4
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN))
    let left = align === 'end' ? r.right - w : r.left
    // flip horizontally when the preferred side would overflow, then clamp
    if (left < MARGIN) left = align === 'end' ? r.left : left
    if (left + w > vw - MARGIN) left = align === 'start' ? r.right - w : left
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN))
    const originX = r.left + r.width / 2 - left
    setPos({ top, left, origin: `${Math.round(originX)}px ${openUp ? '100%' : '0'}` })
  }, [align])

  useLayoutEffect(() => {
    if (open && !sheet) place()
  }, [open, sheet, place, items.length])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const onMove = () => {
      if (!sheet) place()
    }
    document.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, sheet, place])

  useEffect(() => {
    if (open && sheet) {
      const previous = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = previous
      }
    }
  }, [open, sheet])

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const list = enabledItems()
    const index = list.indexOf(document.activeElement as HTMLElement)
    const focusAt = (i: number) => list[(i + list.length) % list.length]?.focus({ preventScroll: true })
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusAt(index + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusAt(index <= 0 ? list.length - 1 : index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(list.length - 1)
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        close(true)
        break
      case 'Tab':
        close(false)
        break
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          const ta = typeahead.current
          window.clearTimeout(ta.timer)
          ta.text += event.key.toLowerCase()
          ta.timer = window.setTimeout(() => (ta.text = ''), 600)
          const match = list.find((el) => el.textContent?.trim().toLowerCase().startsWith(ta.text))
          match?.focus({ preventScroll: true })
        }
    }
  }

  const menu = open ? (
    <>
      {sheet ? (
        <div
          aria-hidden
          className={`fixed inset-0 animate-fade-in bg-[rgb(var(--rgb-overlay)/0.5)] ${raised ? 'z-[90]' : 'z-[70]'}`}
          onClick={() => close(true)}
        />
      ) : null}
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={label}
        onKeyDown={onMenuKeyDown}
        onClick={(event) => event.stopPropagation()}
        style={
          sheet
            ? undefined
            : { top: pos?.top ?? 0, left: pos?.left ?? 0, transformOrigin: pos?.origin, visibility: pos ? 'visible' : 'hidden' }
        }
        className={
          sheet
            ? `fixed inset-x-0 bottom-0 max-h-[80dvh] animate-sheet-in overflow-y-auto rounded-t-2xl border-t border-border bg-surface-raised px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-xl ${
                raised ? 'z-[90]' : 'z-[70]'
              }`
            : `scrollbar-thin fixed max-h-[min(24rem,calc(100dvh-1rem))] min-w-[11rem] max-w-[18rem] animate-pop-in overflow-y-auto rounded-xl border border-border bg-surface-raised p-1 shadow-pop ${
                raised ? 'z-[90]' : 'z-[70]'
              }`
        }
      >
        {sheet ? (
          <>
            <div aria-hidden className="mx-auto mb-2 mt-1 h-1 w-9 rounded-full bg-border-strong" />
            <p className="truncate px-3 pb-1 text-xs font-medium text-text-muted">{label}</p>
          </>
        ) : null}
        {items.map((item, i) => (
          <div key={`${item.label}-${i}`}>
            {item.separatorBefore && i > 0 ? <div role="separator" className="-mx-1 my-1 h-px bg-border" /> : null}
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={item.disabled || undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 text-left transition-colors focus:outline-none ${
                sheet ? 'min-h-12 text-base' : 'min-h-9 py-1.5 text-sm'
              } ${
                item.disabled
                  ? 'cursor-not-allowed opacity-45'
                  : item.danger
                    ? 'text-danger hover:bg-danger/10 focus:bg-danger/10'
                    : 'text-text-primary hover:bg-surface-hover focus:bg-surface-hover'
              }`}
              onClick={() => {
                if (item.disabled) return
                // Return focus to the trigger first so a dialog opened by the action restores to it.
                setOpen(false)
                triggerRef.current?.focus({ preventScroll: true })
                item.onClick()
              }}
            >
              {item.icon ? (
                <span
                  aria-hidden
                  className={`inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-4 ${item.danger ? '' : 'text-text-muted'}`}
                >
                  {item.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </button>
          </div>
        ))}
      </div>
    </>
  ) : null

  return (
    <div className="relative inline-flex" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={
          buttonClassName ??
          'relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors after:absolute after:-inset-1 after:content-[""] hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-surface-hover aria-expanded:text-text-primary sm:h-8 sm:w-8 sm:after:hidden'
        }
        onClick={() => (open ? close(false) : openMenu('first'))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) openMenu(event.key === 'ArrowUp' ? 'last' : 'first')
          }
        }}
      >
        {trigger ?? <MoreHorizontal className="h-4 w-4" />}
      </button>
      {menu && typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </div>
  )
}
