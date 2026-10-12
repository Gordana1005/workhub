/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Avatar: <Avatar src? alt fallback? size='xs'|'sm'|'md'|'lg'|'xl' className? />
 *   No photo (or it fails to load) -> initials on a stable per-name tint (light + dark safe).
 * AvatarGroup: <AvatarGroup avatars={[{alt, src?}]} max={4} size='sm' />  overlapping stack + "+N".
 */
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  src?: string | null
  alt: string
  fallback?: string
  size?: AvatarSize
  className?: string
}

const sizeClass: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

function hueFor(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  return hash % 360
}

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => Array.from(part)[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || '?'
  )
}

export const Avatar = ({ src, alt, fallback, size = 'md', className }: AvatarProps) => {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  const initials = fallback || initialsOf(alt)
  const showImage = Boolean(src) && !failed

  return (
    <div
      className={twMerge(
        clsx(
          'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold leading-none',
          showImage ? 'border border-border bg-surface' : 'avatar-tint',
          sizeClass[size],
          className
        )
      )}
      style={showImage ? undefined : ({ '--av-h': hueFor(alt || initials) } as React.CSSProperties)}
    >
      {showImage ? (
        <img src={src as string} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span role="img" aria-label={alt}>
          {initials}
        </span>
      )}
    </div>
  )
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = 'sm',
  className,
}: {
  avatars: { src?: string | null; alt: string; fallback?: string }[]
  max?: number
  size?: AvatarSize
  className?: string
}) {
  const shown = avatars.slice(0, max)
  const extra = avatars.length - shown.length
  const ring = 'ring-2 ring-surface'
  return (
    <div className={clsx('flex items-center -space-x-2', className)} role="group">
      {shown.map((avatar, index) => (
        <Avatar key={`${avatar.alt}-${index}`} {...avatar} size={size} className={ring} />
      ))}
      {extra > 0 ? (
        <span
          className={clsx(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-tertiary text-[11px] font-semibold text-text-secondary',
            sizeClass[size],
            ring
          )}
          aria-label={`+${extra}`}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  )
}
