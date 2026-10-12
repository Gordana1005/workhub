import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Badge: tinted pill using status tokens (AA contrast on their tint in both themes).
 *   <Badge variant="success|warning|danger|neutral|blue|primary|info" size="sm|md" dot?>
 * `blue`, `primary` and `info` are the same tone (blue kept for backward compatibility).
 */
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'blue' | 'primary' | 'info'
  size?: 'sm' | 'md'
  dot?: boolean
}

const tones = {
  success: 'bg-success/[0.12] text-success ring-success/20',
  warning: 'bg-warning/[0.14] text-warning ring-warning/25',
  danger: 'bg-danger/10 text-danger ring-danger/20',
  neutral: 'bg-tertiary text-text-secondary ring-border',
  blue: 'bg-primary/10 text-primary ring-primary/20',
} as const

const dots = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-text-muted',
  blue: 'bg-primary',
} as const

export const Badge = ({ className, variant = 'neutral', size = 'md', dot = false, children, ...props }: BadgeProps) => {
  const tone = variant === 'primary' || variant === 'info' ? 'blue' : variant
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset transition-colors',
          size === 'sm' ? 'px-2 py-px text-[11px] leading-4' : 'px-2.5 py-0.5 text-xs leading-5',
          tones[tone],
          className
        )
      )}
      {...props}
    >
      {dot ? <span aria-hidden className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', dots[tone])} /> : null}
      {children}
    </span>
  )
}
