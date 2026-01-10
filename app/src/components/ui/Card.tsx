import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', hover = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'bg-surface border border-border rounded-xl transition-all duration-200',
            {
              'p-0': padding === 'none',
              'p-4': padding === 'sm',
              'p-6': padding === 'md',
              'p-8': padding === 'lg',
              'hover:border-primary/50 hover:shadow-md cursor-pointer': hover,
            },
            className
          )
        )}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'
