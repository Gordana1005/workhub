'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

export default function WorkspaceOverview({
  name,
  role,
  members,
  owner,
}: {
  name: string
  role: string
  members: number
  owner: string
}) {
  const t = useTranslations('pages.people')
  const roleLabel = role === 'admin' ? t('team.roleAdmin') : t('team.roleMember')

  const links = [
    { href: '/dashboard/projects', label: t('overview.projects') },
    { href: '/dashboard/tasks', label: t('overview.tasks') },
    { href: '/dashboard/time-tracker', label: t('overview.timeTracked') },
    { href: '/dashboard/reports', label: t('overview.viewReports') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={name} />
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
        <span>{t('overview.role', { role: roleLabel })}</span>
        <span>{t('overview.members', { count: members })}</span>
        <span className="min-w-0 break-words">{t('overview.owner', { name: owner || t('overview.unknownOwner') })}</span>
      </p>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface-hover"
            >
              <span className="min-w-0 truncate">{link.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
