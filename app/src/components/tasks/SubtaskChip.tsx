'use client'

import { useTranslations } from 'next-intl'
import { subtaskProgress } from '@/lib/subtasks'

/** Tiny progress ring (14px by default) used by the chip and the detail panel. */
export function ProgressRing({
  percent,
  complete,
  size = 14,
  className = '',
}: {
  percent: number
  complete?: boolean
  size?: number
  className?: string
}) {
  const radius = 6
  const circumference = 2 * Math.PI * radius
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={`shrink-0 -rotate-90 ${className}`}
    >
      <circle cx="8" cy="8" r={radius} strokeWidth="2" stroke="currentColor" className="text-border-control" />
      {percent > 0 ? (
        <circle
          cx="8"
          cy="8"
          r={radius}
          strokeWidth="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(100, percent) / 100)}
          className={complete ? 'text-success' : 'text-primary'}
        />
      ) : null}
    </svg>
  )
}

/**
 * "2/5" chip with a mini progress ring. Renders nothing when the task has no subtasks, so it can
 * be dropped into any row without a guard.
 */
export default function SubtaskChip({
  total,
  done,
  className = '',
}: {
  total?: number | null
  done?: number | null
  className?: string
}) {
  const t = useTranslations('pages.tasks')
  const progress = subtaskProgress(total, done)
  if (progress.total === 0) return null
  const label = t('subtasksProgressLabel', { done: progress.done, total: progress.total })
  return (
    <span
      title={label}
      className={`inline-flex shrink-0 items-center gap-1 text-xs tabular-nums ${
        progress.complete ? 'text-success' : 'text-text-secondary'
      } ${className}`}
    >
      <ProgressRing percent={progress.percent} complete={progress.complete} />
      <span aria-hidden>
        {progress.done}/{progress.total}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
