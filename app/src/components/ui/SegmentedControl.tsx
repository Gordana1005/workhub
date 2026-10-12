'use client'

/**
 * SegmentedControl: compact single-choice switch (view modes, ranges, filters).
 *   <SegmentedControl ariaLabel value onChange options={[{ value, label, icon?, disabled? }]}
 *                     size?='sm'|'md' fullWidth? />
 * Radiogroup semantics, arrow-key navigation (roving tabindex). 40px on phone, 32px on sm+ (md=36px).
 */
import { useRef, type ReactNode } from 'react'
import { clsx } from 'clsx'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = 'md',
  fullWidth = false,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  ariaLabel: string
  size?: 'sm' | 'md'
  fullWidth?: boolean
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (from: number, step: number) => {
    const count = options.length
    for (let i = 1; i <= count; i++) {
      const next = (from + step * i + count * i) % count
      if (!options[next].disabled) {
        onChange(options[next].value)
        refs.current[next]?.focus()
        return
      }
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-lg bg-tertiary p-0.5',
        fullWidth && 'flex w-full',
        className
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                move(index, 1)
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                move(index, -1)
              }
            }}
            className={clsx(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:h-4 [&>svg]:w-4',
              size === 'sm' ? 'h-10 text-[13px] sm:h-7' : 'h-10 sm:h-8',
              fullWidth && 'flex-1',
              selected
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
