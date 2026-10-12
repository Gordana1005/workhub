import { clsx } from 'clsx'

/**
 * Skeleton: shimmering placeholder block (static under prefers-reduced-motion).
 *   <Skeleton className="h-4 w-1/2" />   <SkeletonText lines={3} />   <SkeletonAvatar size={40} />
 * Decorative: aria-hidden. Wrap a group with role="status" + a visually-hidden label if needed.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx('skeleton', className)} />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={clsx('skeleton h-3.5', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx('skeleton shrink-0 !rounded-full', className)}
      style={{ width: size, height: size }}
    />
  )
}
