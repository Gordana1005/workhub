'use client'

/**
 * Tabs: underline (default) or pill tab strip. Scrolls horizontally on phone without a scrollbar.
 *   <Tabs ariaLabel value onChange tabs={[{ id, label, count?, icon?, disabled? }]}
 *         variant?='underline'|'pill' idPrefix?='tabs' />
 * Tab ids are `${idPrefix}-tab-${id}`; give your panel role="tabpanel" aria-labelledby={that id}.
 * Arrow keys / Home / End move + activate (automatic activation). Tap targets are 44px tall.
 */
import { useRef, type ReactNode } from 'react'
import { clsx } from 'clsx'

export interface TabItem {
  id: string
  label: ReactNode
  count?: number
  icon?: ReactNode
  disabled?: boolean
}

export function Tabs({
  tabs,
  value,
  onChange,
  ariaLabel,
  variant = 'underline',
  idPrefix = 'tabs',
  className,
}: {
  tabs: TabItem[]
  value: string
  onChange: (id: string) => void
  ariaLabel: string
  variant?: 'underline' | 'pill'
  idPrefix?: string
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const go = (index: number) => {
    const target = tabs[index]
    if (!target || target.disabled) return
    onChange(target.id)
    refs.current[index]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1
    if (event.key === 'ArrowRight') go(index === last ? 0 : index + 1)
    else if (event.key === 'ArrowLeft') go(index === 0 ? last : index - 1)
    else if (event.key === 'Home') go(0)
    else if (event.key === 'End') go(last)
    else return
    event.preventDefault()
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={clsx(
        'scrollbar-hide flex max-w-full items-center overflow-x-auto',
        variant === 'underline' ? 'gap-1 border-b border-border' : 'gap-1',
        className
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el
            }}
            id={`${idPrefix}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={clsx(
              'relative inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-sm font-medium transition-colors sm:h-10',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:h-4 [&>svg]:w-4',
              variant === 'underline'
                ? clsx(
                    'rounded-t-lg after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors',
                    selected
                      ? 'text-text-primary after:bg-primary'
                      : 'text-text-secondary after:bg-transparent hover:text-text-primary'
                  )
                : clsx(
                    'rounded-lg',
                    selected
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  )
            )}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span
                className={clsx(
                  'rounded-full px-1.5 text-[11px] font-semibold leading-5 tabular-nums',
                  selected && variant === 'pill' ? 'bg-primary/15 text-primary' : 'bg-tertiary text-text-secondary'
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
