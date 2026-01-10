/* eslint-disable @next/next/no-img-element */
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface AvatarProps {
  src?: string | null
  alt: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const Avatar = ({ src, alt, fallback, size = 'md', className }: AvatarProps) => {
  const initials = fallback || alt.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div
      className={twMerge(
        clsx(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface border border-border text-text-secondary',
          {
            'h-8 w-8 text-xs': size === 'sm',
            'h-10 w-10 text-sm': size === 'md',
            'h-12 w-12 text-base': size === 'lg',
            'h-16 w-16 text-lg': size === 'xl',
          },
          className
        )
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-medium">{initials}</span>
      )}
    </div>
  )
}
