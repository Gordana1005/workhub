import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={twMerge(
              clsx(
                'w-full rounded-lg border bg-secondary px-4 py-2.5 text-sm transition-all duration-200',
                'border-border text-text-primary placeholder-text-muted',
                'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                'disabled:cursor-not-allowed disabled:opacity-50',
                {
                  'pl-10': !!icon,
                  'border-danger focus:border-danger focus:ring-danger': !!error,
                },
                className
              )
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
