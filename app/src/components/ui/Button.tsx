/**
 * Button: TrackWork design system
 * --------------------------------
 * <Button variant size fullWidth loading leftIcon rightIcon iconOnly />
 *   variant  primary (default) | secondary | outline | ghost | danger (soft red) | destructive (solid red)
 *   size     sm (32px; 36px on phone) | md (40px, default) | lg (48px)
 *   loading  shows a spinner, sets disabled + aria-busy (label stays so width doesn't jump)
 *   iconOnly square button; ALWAYS pass aria-label. Children = the icon.
 *   leftIcon / rightIcon  any ReactNode (lucide icon); auto-sized to 16px.
 *
 * Link that looks like a button (no wrapper component needed):
 *   <Link href="/x" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>Open</Link>
 *   buttonClasses({ variant, size, fullWidth, iconOnly, className })  -> string (twMerge'd)
 *
 * Tokens used: bg-primary(+hover/active), bg-surface, border-border-strong, text-text-*,
 * shadow-btn / shadow-btn-primary, ring-primary + ring-offset-surface (focus), radius lg.
 * Tap targets: md = 40px, sm grows to 36px on phone. Disabled = 50% opacity + no pointer events.
 */
import { forwardRef, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  iconOnly?: boolean
  className?: string
}

const base =
  'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium leading-none ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 ' +
  '[&>svg]:shrink-0'

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] sm:h-8',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

const iconSizes: Record<ButtonSize, string> = {
  sm: 'h-9 w-9 p-0 text-[13px] sm:h-8 sm:w-8',
  md: 'h-10 w-10 p-0 text-sm',
  lg: 'h-12 w-12 p-0 text-base',
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-btn-primary hover:bg-primary-hover active:bg-primary-active',
  secondary:
    'border border-border-strong bg-surface text-text-primary shadow-btn hover:bg-surface-hover active:bg-tertiary',
  outline:
    'border border-border-strong bg-transparent text-text-primary hover:bg-surface-hover active:bg-tertiary',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary active:bg-tertiary',
  danger:
    'bg-danger/10 text-danger hover:bg-danger/[0.16] active:bg-danger/20 focus-visible:ring-danger',
  destructive:
    'bg-danger text-white shadow-btn-primary hover:bg-danger-hover active:bg-danger-hover focus-visible:ring-danger',
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconOnly = false,
  className,
}: ButtonStyleOptions = {}): string {
  return twMerge(
    clsx(base, iconOnly ? iconSizes[size] : sizes[size], variants[variant], fullWidth && 'w-full', className)
  )
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  iconOnly?: boolean
}

const iconWrap = '[&>svg]:h-4 [&>svg]:w-4 inline-flex shrink-0 items-center justify-center'

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={buttonClasses({ variant, size, fullWidth, iconOnly, className })}
        {...props}
      >
        {loading ? <Spinner /> : leftIcon ? <span className={iconWrap}>{leftIcon}</span> : null}
        {iconOnly && loading ? null : children}
        {rightIcon && !loading ? <span className={iconWrap}>{rightIcon}</span> : null}
      </button>
    )
  }
)

Button.displayName = 'Button'
