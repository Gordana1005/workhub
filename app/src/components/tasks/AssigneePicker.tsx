'use client'

import { useMemo } from 'react'
import { ChevronDown, UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Avatar } from '@/components/ui/Avatar'
import { PickerMenu, type PickerOption } from '@/components/ui/PickerMenu'
import type { MemberOption } from './types'

export type AssigneePickerVariant = 'field' | 'chip' | 'form' | 'compact'

const triggerClass: Record<AssigneePickerVariant, string> = {
  field:
    'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left text-sm text-text-primary transition-colors hover:bg-surface-hover active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60',
  chip: 'inline-flex h-10 max-w-[14rem] shrink-0 items-center gap-2 rounded-full border border-border-strong bg-surface pl-1.5 pr-3 text-sm font-medium text-text-primary transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60',
  /** Avatar-only round button for dense rows (subtasks); the name stays available to screen readers. */
  compact:
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-hover active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 sm:h-8 sm:w-8',
  form: 'flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-secondary px-3 text-left text-base text-text-primary transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-sm',
}

/**
 * Assignee combobox: lists every member of the workspace (avatar, name, role, open tasks),
 * with search, "Assign to me" and "Unassigned". Popover on desktop, bottom sheet on phone.
 * `value` is a user id ('' = unassigned); onChange gets the new id ('' to unassign).
 */
export default function AssigneePicker({
  members,
  value,
  currentUserId,
  onChange,
  variant = 'field',
  counts,
  disabled,
  fallbackName,
  id,
}: {
  members: MemberOption[]
  value: string
  currentUserId: string
  onChange: (id: string) => void
  variant?: AssigneePickerVariant
  /** open task count per user id (optional) */
  counts?: Record<string, number>
  disabled?: boolean
  /** name to show when the assignee is not (yet) in `members` */
  fallbackName?: string
  id?: string
}) {
  const t = useTranslations('pages.tasks')
  const current = members.find((member) => member.id === value)
  const name = current?.username || fallbackName || ''
  const me = members.find((member) => member.id === currentUserId)

  const options = useMemo<PickerOption[]>(() => {
    const roleLabel = (role?: string) =>
      role === 'owner' ? t('roleOwner') : role === 'admin' ? t('roleAdmin') : role === 'member' ? t('roleMember') : role || ''
    const list: PickerOption[] = []
    if (me && value !== me.id) {
      list.push({
        id: '__me',
        label: t('assignToMe'),
        icon: <Avatar src={me.avatar_url} alt={me.username} size="xs" />,
        keywords: me.username,
      })
    }
    list.push({
      id: '',
      label: t('unassigned'),
      icon: (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border-strong text-text-muted">
          <UserRound className="h-3.5 w-3.5" aria-hidden />
        </span>
      ),
      keywords: 'none nobody',
    })
    members.forEach((member, index) => {
      const count = counts?.[member.id]
      const parts = [roleLabel(member.role), typeof count === 'number' ? t('openTasksCount', { count }) : ''].filter(Boolean)
      list.push({
        id: member.id,
        label: member.id === currentUserId ? `${member.username} (${t('you')})` : member.username,
        description: parts.join(' · ') || member.email || undefined,
        icon: <Avatar src={member.avatar_url} alt={member.username} size="xs" />,
        keywords: `${member.username} ${member.email || ''}`,
        separatorBefore: index === 0,
      })
    })
    return list
  }, [members, me, value, currentUserId, counts, t])

  const label = name || t('unassigned')

  return (
    <PickerMenu
      title={t('assignee')}
      triggerLabel={`${t('assignee')}: ${label}`}
      triggerClassName={triggerClass[variant]}
      options={options}
      value={value}
      onSelect={(picked) => onChange(picked === '__me' ? currentUserId : picked)}
      searchable
      searchPlaceholder={t('searchMembers')}
      emptyLabel={t('noMembersFound')}
      disabled={disabled}
      align="end"
      width={296}
      trigger={
        <>
          {name ? (
            <Avatar src={current?.avatar_url} alt={name} size="xs" />
          ) : (
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-text-muted">
              <UserRound className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}
          <span id={id} className={variant === 'compact' ? 'sr-only' : `min-w-0 flex-1 truncate ${name ? '' : 'text-text-muted'}`}>
            {label}
          </span>
          {variant === 'form' ? <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden /> : null}
        </>
      }
    />
  )
}
