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
  large = false,
  stretchOnPhone = false,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  label: string
  className?: string
  fullWidth?: boolean
  /** Taller, larger-type buttons for primary phone forms */
  large?: boolean
  /** Fill the row on phones, shrink to content from sm */
  stretchOnPhone?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${fullWidth ? 'flex w-full' : stretchOnPhone ? 'flex w-full sm:inline-flex sm:w-auto' : 'inline-flex'} items-center gap-0.5 rounded-xl bg-surface-hover p-1 ${className}`}
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
            className={`min-w-0 whitespace-nowrap rounded-lg px-3 py-1 text-sm font-medium max-sm:whitespace-normal max-sm:px-1.5 max-sm:text-center max-sm:leading-tight transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              large ? 'min-h-12 text-base sm:min-h-10 sm:text-sm' : 'min-h-10 sm:min-h-8'
            } ${
              fullWidth ? 'flex-1' : stretchOnPhone ? 'flex-1 sm:flex-none' : ''
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
