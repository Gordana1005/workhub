'use client'

/**
 * PickerMenu: a button that opens a searchable option list (popover on sm+, bottom sheet on phone).
 *   <PickerMenu title triggerClassName trigger options? value? onSelect? searchable? children? />
 * - options mode: listbox with arrow keys / Home / End / Enter / Esc, optional search, selected check.
 *   Option rows: { id, label, description?, icon?, keywords?, disabled?, separatorBefore? }.
 * - custom mode: pass `children={(close) => node}` for free-form content (date picker, etc.).
 * - portal + position:fixed (never clipped), flips above/below, clamps to the viewport, z-[90]
 *   so it also works inside dialogs and detail sheets. The sheet follows the on-screen keyboard.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, Search } from 'lucide-react'
import { useVisualViewport } from '@/hooks/useVisualViewport'

export interface PickerOption {
  id: string
  label: string
  description?: string
  icon?: ReactNode
  keywords?: string
  disabled?: boolean
  separatorBefore?: boolean
}

const MARGIN = 8

export function PickerMenu({
  title,
  trigger,
  triggerClassName,
  triggerLabel,
  options,
  value,
  onSelect,
  searchable = false,
  searchPlaceholder,
  emptyLabel,
  children,
  disabled = false,
  align = 'start',
  width = 288,
}: {
  title: string
  trigger: ReactNode
  triggerClassName: string
  triggerLabel?: string
  options?: PickerOption[]
  value?: string | null
  onSelect?: (id: string) => void
  searchable?: boolean
  searchPlaceholder?: string
  emptyLabel?: string
  children?: (close: () => void) => ReactNode
  disabled?: boolean
  align?: 'start' | 'end'
  width?: number
}) {
  const uid = useId()
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const keyboard = useVisualViewport(open && sheet)

  const filtered = useMemo(() => {
    if (!options) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) =>
      `${option.label} ${option.description ?? ''} ${option.keywords ?? ''}`.toLowerCase().includes(needle)
    )
  }, [options, query])

  const close = useCallback((returnFocus = true) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const openMenu = () => {
    setSheet(window.innerWidth < 640)
    setQuery('')
    const index = options ? options.findIndex((option) => option.id === (value ?? '')) : -1
    setActive(Math.max(0, index))
    setOpen(true)
  }

  const place = useCallback(() => {
    const trig = triggerRef.current
    if (!trig) return
    const rect = trig.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = Math.min(width, vw - MARGIN * 2)
    const left = Math.max(MARGIN, Math.min(align === 'end' ? rect.right - w : rect.left, vw - w - MARGIN))
    const below = vh - rect.bottom - MARGIN
    const above = rect.top - MARGIN
    if (below >= 260 || below >= above) {
      setPos({ top: rect.bottom + 4, left, maxHeight: Math.max(160, Math.min(380, below - 4)) })
    } else {
      setPos({ bottom: vh - rect.top + 4, left, maxHeight: Math.max(160, Math.min(380, above - 4)) })
    }
  }, [align, width])

  useLayoutEffect(() => {
    if (open && !sheet) place()
  }, [open, sheet, place])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close(false)
    }
    const onReflow = (event: Event) => {
      if (event.type === 'scroll' && panelRef.current?.contains(event.target as Node)) return
      if (sheet) return
      place()
    }
    document.addEventListener('mousedown', onMouseDown)
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [open, sheet, place, close])

  // initial focus: the search field on desktop, otherwise the panel (no surprise keyboard on touch)
  useEffect(() => {
    if (!open) return
    const raf = window.requestAnimationFrame(() => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches
      if (searchable && !coarse && !sheet) searchRef.current?.focus({ preventScroll: true })
      else panelRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(raf)
  }, [open, searchable, sheet])

  useEffect(() => {
    if (!open) return
    setActive((index) => Math.min(index, Math.max(0, filtered.length - 1)))
  }, [filtered.length, open])

  useEffect(() => {
    if (!open || !options) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, options])

  const choose = (option: PickerOption) => {
    if (option.disabled) return
    onSelect?.(option.id)
    close()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (!options) return
    const count = filtered.length
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (count ? (index + 1) % count : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (count ? (index - 1 + count) % count : 0))
    } else if (event.key === 'Home' && event.target !== searchRef.current) {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End' && event.target !== searchRef.current) {
      event.preventDefault()
      setActive(Math.max(0, count - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[active]
      if (option) choose(option)
    } else if (event.key === 'Tab') {
      close(false)
    }
  }

  const body = (
    <>
      {options && searchable ? (
        <div className="shrink-0 border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${uid}-list`}
              aria-activedescendant={filtered[active] ? `${uid}-opt-${active}` : undefined}
              aria-label={searchPlaceholder || title}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="h-11 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-9 sm:text-sm"
            />
          </div>
        </div>
      ) : null}
      {options ? (
        <div
          ref={listRef}
          id={`${uid}-list`}
          role="listbox"
          aria-label={title}
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">{emptyLabel ?? '—'}</p>
          ) : (
            filtered.map((option, index) => {
              const selected = option.id === (value ?? '')
              return (
                <div key={option.id || '__empty'}>
                  {option.separatorBefore && index > 0 ? <div role="separator" className="-mx-1 my-1 h-px bg-border" /> : null}
                  <div
                    id={`${uid}-opt-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={option.disabled || undefined}
                    onMouseMove={() => setActive(index)}
                    onClick={() => choose(option)}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 text-left transition-colors active:bg-tertiary sm:min-h-10 ${
                      index === active ? 'bg-surface-hover' : ''
                    } ${option.disabled ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    {option.icon ? <span className="inline-flex shrink-0 items-center">{option.icon}</span> : null}
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-base sm:text-sm ${selected ? 'font-semibold' : 'font-medium'} text-text-primary`}>
                        {option.label}
                      </span>
                      {option.description ? (
                        <span className="block truncate text-xs text-text-muted">{option.description}</span>
                      ) : null}
                    </span>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden /> : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">{children?.(() => close())}</div>
      )}
    </>
  )

  const panel =
    open && typeof document !== 'undefined'
      ? createPortal(
          sheet ? (
            <div className="fixed inset-0 z-[90] animate-fade-in" onKeyDown={onKeyDown}>
              <div
                className="absolute inset-0 bg-[rgb(var(--rgb-overlay)/0.55)]"
                aria-hidden
                onClick={() => close(false)}
              />
              <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                style={
                  keyboard
                    ? { bottom: keyboard.inset, maxHeight: Math.max(240, keyboard.height - 16) }
                    : undefined
                }
                className="absolute inset-x-0 bottom-0 flex max-h-[80dvh] animate-sheet-in flex-col rounded-t-2xl border-t border-border bg-surface-raised pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-xl outline-none"
              >
                <div aria-hidden className="mx-auto mb-1 mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong" />
                <p className="shrink-0 px-4 pb-2 pt-1 text-sm font-semibold text-text-primary">{title}</p>
                {body}
              </div>
            </div>
          ) : (
            <div
              ref={panelRef}
              role="dialog"
              aria-label={title}
              tabIndex={-1}
              onKeyDown={onKeyDown}
              style={{
                position: 'fixed',
                top: pos?.top,
                bottom: pos?.bottom,
                left: pos?.left ?? -9999,
                width: Math.min(width, typeof window !== 'undefined' ? window.innerWidth - MARGIN * 2 : width),
                maxHeight: pos?.maxHeight,
              }}
              className="z-[90] flex animate-pop-in flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-pop outline-none"
            >
              {body}
            </div>
          ),
          document.body
        )
      : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openMenu())}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {panel}
    </>
  )
}
