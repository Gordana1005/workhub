import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={twMerge(
          clsx(
            // Base styles
            'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',
            
            // Size variants
            {
              'h-8 px-3 text-xs': size === 'sm',
              'h-10 px-4 text-sm': size === 'md',
              'h-12 px-6 text-base': size === 'lg',
              'w-full': fullWidth,
            },

            // Variant styles (Deel System)
            {
              // Primary: Brand Blue
              'bg-primary text-white shadow-sm hover:bg-primary/90': variant === 'primary',
              
              // Secondary: Surface based
              'bg-surface hover:bg-surface-hover text-text-primary border border-border': variant === 'secondary',
              
              // Outline: Transparent with border
              'bg-transparent border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover': variant === 'outline',
              
              // Ghost: No background
              'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover': variant === 'ghost',
              
              // Danger
              'bg-danger/10 text-danger hover:bg-danger/20': variant === 'danger',
            },
            className
          )
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
