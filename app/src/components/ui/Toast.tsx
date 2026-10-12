'use client'

/**
 * Toasts. <ToastProvider> is mounted once inside QueryProvider (app-wide, already done).
 *   const toast = useToast()
 *   toast.success('Task saved')                                  // string shorthand
 *   toast.error('Could not save', { description: err.message })
 *   toast.show({ title, description?, tone?: 'default'|'success'|'error'|'warning', duration?, action?: { label, onClick } })
 * Auto-dismiss 4s (errors 7s, 0 = sticky), pauses on hover/focus. Bottom-centre above the mobile tab bar,
 * bottom-right on lg+. z-[95] (above dialogs). aria-live: polite (errors: assertive).
 * useToast() must be called inside the intl provider (any page/component); outside a provider it no-ops.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export type ToastTone = 'default' | 'success' | 'error' | 'warning'

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastItem extends ToastOptions {
  id: number
  dismissLabel: string
}

interface ToastContextValue {
  push: (item: ToastOptions & { dismissLabel: string }) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneIcon = {
  default: { Icon: Info, cls: 'text-primary' },
  success: { Icon: CheckCircle2, cls: 'text-success' },
  error: { Icon: XCircle, cls: 'text-danger' },
  warning: { Icon: AlertTriangle, cls: 'text-warning' },
} as const

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((item) => item.id !== id)), [])
  const push = useCallback((options: ToastOptions & { dismissLabel: string }) => {
    const id = nextId++
    setItems((list) => [...list.slice(-3), { ...options, id }])
    return id
  }, [])

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[95] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end lg:px-0"
            >
              {items.map((item) => (
                <ToastCard key={item.id} item={item} onDismiss={dismiss} />
              ))}
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const tone = item.tone ?? 'default'
  const { Icon, cls } = toneIcon[tone]
  const duration = item.duration ?? (tone === 'error' ? 7000 : 4000)
  const [paused, setPaused] = useState(false)
  const remaining = useRef(duration)
  const startedAt = useRef(0)

  useEffect(() => {
    if (duration <= 0 || paused) return
    startedAt.current = Date.now()
    const timer = window.setTimeout(() => onDismiss(item.id), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current = Math.max(1000, remaining.current - (Date.now() - startedAt.current))
    }
  }, [paused, duration, item.id, onDismiss])

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl border border-border bg-surface-raised p-3 pr-2 shadow-pop"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cls}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5 text-text-primary">{item.title}</p>
        {item.description ? <p className="mt-0.5 text-sm leading-5 text-text-secondary">{item.description}</p> : null}
        {item.action ? (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick()
              onDismiss(item.id)
            }}
            className="mt-1.5 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {item.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={item.dismissLabel}
        onClick={() => onDismiss(item.id)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  const t = useTranslations('common')
  const dismissLabel = t('dismiss')

  return useMemo(() => {
    const show = (options: ToastOptions) => ctx?.push({ ...options, dismissLabel }) ?? -1
    const make =
      (tone: ToastTone) =>
      (title: string, extra?: Omit<ToastOptions, 'title' | 'tone'>) =>
        show({ ...extra, title, tone })
    return {
      show,
      success: make('success'),
      error: make('error'),
      warning: make('warning'),
      info: make('default'),
      dismiss: (id: number) => ctx?.dismiss(id),
    }
  }, [ctx, dismissLabel])
}
