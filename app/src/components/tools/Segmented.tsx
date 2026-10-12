'use client'

import type { ReactNode } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

/** Compact segmented control (radio group) built from theme tokens only. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className = '',
  fullWidth = false,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  label: string
  className?: string
  fullWidth?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${fullWidth ? 'flex w-full' : 'inline-flex'} items-center gap-0.5 rounded-xl bg-surface-hover p-1 ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`min-w-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              fullWidth ? 'flex-1' : ''
            } ${
              selected
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
