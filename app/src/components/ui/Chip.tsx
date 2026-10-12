'use client'

/**
 * Chip: interactive filter/tag pill.
 *   <Chip selected? onClick? onRemove? removeLabel? icon? size?='sm'|'md'>Label</Chip>
 * - with onClick it is a toggle button (aria-pressed); without it a static tag.
 * - onRemove adds an "x" button (pass removeLabel, already translated, for screen readers).
 * Use <Badge> for read-only status; Chip for things people click/toggle/remove.
 */
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

export function Chip({
  children,
  selected = false,
  onClick,
  onRemove,
  removeLabel,
  icon,
  size = 'md',
  className,
}: {
  children: ReactNode
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
  removeLabel?: string
  icon?: ReactNode
  size?: 'sm' | 'md'
  className?: string
}) {
  const classes = clsx(
    'inline-flex max-w-full items-center gap-1.5 rounded-full border font-medium transition-colors [&>svg]:h-3.5 [&>svg]:w-3.5',
    size === 'sm' ? 'h-8 px-2.5 text-xs sm:h-7' : 'h-9 px-3 text-[13px] sm:h-8',
    selected
      ? 'border-primary/40 bg-primary/10 text-primary'
      : 'border-border-strong bg-surface text-text-secondary',
    onClick && !selected && 'hover:bg-surface-hover hover:text-text-primary',
    className
  )
  const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  const label = (
    <>
      {icon}
      <span className="truncate">{children}</span>
    </>
  )

  if (!onRemove) {
    return onClick ? (
      <button type="button" aria-pressed={selected} onClick={onClick} className={clsx(classes, focus)}>
        {label}
      </button>
    ) : (
      <span className={classes}>{label}</span>
    )
  }

  return (
    <span className={clsx(classes, 'pr-1')}>
      {onClick ? (
        <button type="button" aria-pressed={selected} onClick={onClick} className={clsx('inline-flex items-center gap-1.5 rounded-full', focus)}>
          {label}
        </button>
      ) : (
        label
      )}
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className={clsx(
          'relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-current opacity-70 transition after:absolute after:-inset-1.5 after:content-[""] hover:bg-black/10 hover:opacity-100 active:bg-black/10 dark:hover:bg-white/10 sm:h-5 sm:w-5 sm:after:hidden',
          focus
        )}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
