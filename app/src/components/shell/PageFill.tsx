import type { ReactNode } from 'react'

/**
 * Full-height page wrapper for app-style pages (boards, calendars, split panes).
 *
 * At lg+ it is exactly the viewport height minus the shell header (3.5rem) and the page
 * padding (pt-6 + lg:pb-8 = 3.5rem), so the document never gets a second scrollbar.
 * Put `min-h-0 overflow-auto` on the child that should scroll. Below lg it is a plain block.
 *
 * `bleed` cancels the shell's horizontal page gutter for edge-to-edge layouts.
 */
export default function PageFill({
  children,
  bleed = false,
  className = '',
}: {
  children: ReactNode
  bleed?: boolean
  className?: string
}) {
  return (
    <div
      data-page-fill
      className={`flex min-h-0 min-w-0 flex-col lg:h-[calc(100dvh-7rem)] ${
        bleed ? '-mx-4 sm:-mx-6 lg:-mx-8' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
