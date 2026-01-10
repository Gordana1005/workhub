import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'blue'
  size?: 'sm' | 'md'
}

export const Badge = ({ className, variant = 'neutral', size = 'md', ...props }: BadgeProps) => {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full font-medium transition-colors',
          {
            // Sizes
            'px-2 py-0.5 text-xs': size === 'sm',
            'px-2.5 py-0.5 text-sm': size === 'md',

            // Variants (Subtle backgrounds, punchy text)
            'bg-success/10 text-success': variant === 'success',
            'bg-warning/10 text-warning': variant === 'warning',
            'bg-danger/10 text-danger': variant === 'danger',
            'bg-secondary text-text-secondary': variant === 'neutral',
            'bg-primary/10 text-primary': variant === 'blue',
          },
          className
        )
      )}
      {...props}
    />
  )
}
