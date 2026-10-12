'use client'

/**
 * PageHeader
 *   <PageHeader title description? action? breadcrumbs?={[{label, href?}]} meta? sticky? />
 * - action: any node (buttons); wraps under the title on phone when it does not fit.
 * - meta: small row under the title/description (badges, counts, dates).
 * - sticky: compact blurred bar that sticks while scrolling. It offsets below the app header via the
 *   CSS variable --app-header-h (defaults to 0px) and bleeds to the page gutter (-mx-4 sm:-mx-6 lg:-mx-8).
 */
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

export interface Breadcrumb {
  label: string
  href?: string
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
  meta,
  sticky = false,
}: {
  title: string
  description?: string
  action?: ReactNode
  breadcrumbs?: Breadcrumb[]
  meta?: ReactNode
  sticky?: boolean
}) {
  const t = useTranslations('common')

  return (
    <header
      className={
        sticky
          ? 'sticky top-[var(--app-header-h,0px)] z-30 -mx-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'
          : undefined
      }
    >
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label={t('breadcrumb')} className="mb-1.5">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
            {breadcrumbs.map((crumb, index) => {
              const last = index === breadcrumbs.length - 1
              return (
                <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
                  {crumb.href && !last ? (
                    <Link
                      href={crumb.href}
                      className="truncate rounded px-0.5 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={last ? 'page' : undefined} className="truncate px-0.5">
                      {crumb.label}
                    </span>
                  )}
                  {!last ? <ChevronRight className="h-3 w-3 shrink-0" aria-hidden /> : null}
                </li>
              )
            })}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-56">
          <h1
            className={`font-semibold tracking-tight text-text-primary ${
              sticky ? 'truncate text-lg sm:text-xl' : 'text-xl sm:text-2xl'
            }`}
          >
            {title}
          </h1>
          {description && !sticky ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">{meta}</div> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </header>
  )
}
