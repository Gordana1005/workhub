import type { ReactNode } from 'react'

/**
 * EmptyState: <EmptyState title body? action? icon? compact? className? />
 * icon: any node, typically a lucide icon (<Inbox />), shown in a tinted tile (auto-sized to 24px).
 */
export function EmptyState({
  title,
  body,
  action,
  icon,
  compact = false,
  className = '',
}: {
  title: string
  body?: string
  action?: ReactNode
  icon?: ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-border-strong bg-surface/60 px-6 text-center ${
        compact ? 'py-8' : 'py-12 sm:py-14'
      } ${className}`}
    >
      {icon ? (
        <div
          aria-hidden
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:h-6 [&>svg]:w-6"
        >
          {icon}
        </div>
      ) : null}
      <h2 className="text-base font-semibold text-text-primary sm:text-lg">{title}</h2>
      {body ? <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-text-secondary">{body}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}
