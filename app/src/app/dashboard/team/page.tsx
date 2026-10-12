'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Check, Copy, Link2, Search, UserPlus, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

interface TeamMember {
  id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profiles: {
    id: string
    username: string | null
    avatar_url: string | null
    email: string
  } | null
  stats?: { projects: number; open_tasks: number; overdue_tasks: number }
}

type RoleFilter = 'all' | 'admin' | 'member'

const COLUMNS = 'lg:grid-cols-[minmax(0,2.2fr)_7rem_6rem_minmax(10rem,1.4fr)_7rem_2.5rem]'

const fieldClass =
  'w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export default function TeamPage() {
  const t = useTranslations('pages.people')
  const locale = useLocale()
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [viewerRole, setViewerRole] = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [notice, setNotice] = useState<string | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [addUsername, setAddUsername] = useState('')
  const [addRole, setAddRole] = useState<'member' | 'admin'>('member')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteSentTo, setInviteSentTo] = useState('')
  const [copied, setCopied] = useState(false)

  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)

  const workspaceId = currentWorkspace?.id
  const isAdmin = viewerRole === 'admin'

  const loadMembers = useCallback(async () => {
    if (!workspaceId) return
    try {
      const response = await fetch(`/api/team?workspace_id=${workspaceId}`)
      const data = await response.json()
      if (response.ok) {
        setMembers(data.members || [])
        setViewerId(data.viewer_id ?? null)
        setViewerRole(data.viewer_role ?? null)
        setOwnerId(data.owner_id ?? null)
      } else {
        setNotice(t('team.loadFailed'))
      }
    } catch (error) {
      console.error('Error loading team members:', error)
      setNotice(t('team.loadFailed'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  useEffect(() => {
    if (workspaceId) {
      setLoading(true)
      loadMembers()
    }
  }, [workspaceId, loadMembers])

  const counts = useMemo(
    () => ({
      all: members.length,
      admin: members.filter((member) => member.role === 'admin').length,
      member: members.filter((member) => member.role === 'member').length,
    }),
    [members]
  )

  const maxOpen = useMemo(() => Math.max(1, ...members.map((member) => member.stats?.open_tasks || 0)), [members])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return members
      .filter((member) => roleFilter === 'all' || member.role === roleFilter)
      .filter((member) => {
        if (!needle) return true
        return `${member.profiles?.username || ''} ${member.profiles?.email || ''}`.toLowerCase().includes(needle)
      })
      .sort((a, b) => {
        const rank = (member: TeamMember) => (member.user_id === ownerId ? 0 : member.role === 'admin' ? 1 : 2)
        return rank(a) - rank(b) || (a.profiles?.username || '').localeCompare(b.profiles?.username || '', locale)
      })
  }, [members, query, roleFilter, ownerId, locale])

  const closeAdd = () => {
    if (addBusy) return
    setShowAdd(false)
    setAddUsername('')
    setAddRole('member')
    setAddError(null)
  }

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    const username = addUsername.trim()
    if (!workspaceId || !username || addBusy) return
    setAddBusy(true)
    setAddError(null)
    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, username, role: addRole }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('team.addFailed'))
      setShowAdd(false)
      setAddUsername('')
      setAddRole('member')
      await loadMembers()
    } catch (error) {
      setAddError(error instanceof Error ? error.message : t('team.addFailed'))
    } finally {
      setAddBusy(false)
    }
  }

  const closeInvite = () => {
    if (inviteBusy) return
    setShowInvite(false)
    setInviteEmail('')
    setInviteRole('member')
    setInviteError(null)
    setInviteLink(null)
    setInviteSentTo('')
    setCopied(false)
  }

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!workspaceId || inviteBusy) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError(t('team.inviteEmailInvalid'))
      return
    }
    setInviteBusy(true)
    setInviteError(null)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, email, role: inviteRole }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('team.inviteFailed'))
      const token = data.invitation?.token
      setInviteLink(token ? `${window.location.origin}/join?token=${encodeURIComponent(token)}` : data.joinLink)
      setInviteSentTo(email)
      setCopied(false)
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : t('team.inviteFailed'))
    } finally {
      setInviteBusy(false)
    }
  }

  const copyInviteLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setInviteError(null)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setInviteError(t('team.copyFailed'))
    }
  }

  const confirmRemove = async () => {
    if (!workspaceId || !removing) return
    setRemoveBusy(true)
    try {
      const response = await fetch(`/api/team?workspace_id=${workspaceId}&user_id=${removing.user_id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('team.removeFailed'))
      setRemoving(null)
      await loadMembers()
    } catch (error) {
      setRemoving(null)
      setNotice(error instanceof Error ? error.message : t('team.removeFailed'))
    } finally {
      setRemoveBusy(false)
    }
  }

  const changeRole = async (member: TeamMember, role: 'admin' | 'member') => {
    if (!workspaceId) return
    try {
      const response = await fetch(`/api/team?workspace_id=${workspaceId}&user_id=${member.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('team.roleFailed'))
      await loadMembers()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('team.roleFailed'))
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('team.title')} />
        <EmptyState title={t('team.selectWorkspace')} />
      </div>
    )
  }

  const roleBadge = (member: TeamMember) => {
    if (member.user_id === ownerId) return <Badge size="sm" variant="blue">{t('team.roleOwner')}</Badge>
    if (member.role === 'admin') return <Badge size="sm" variant="blue">{t('team.roleAdmin')}</Badge>
    return <span className="text-sm text-text-secondary">{t('team.roleMember')}</span>
  }

  const filters: { id: RoleFilter; label: string }[] = [
    { id: 'all', label: t('team.filterAll') },
    { id: 'admin', label: t('team.admins') },
    { id: 'member', label: t('team.members') },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('team.title')}
        description={t('team.subtitle', { workspace: currentWorkspace.name })}
        action={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setShowInvite(true)} className="gap-2" aria-label={t('team.inviteByLink')}>
                <Link2 className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t('team.inviteByLink')}</span>
              </Button>
              <Button onClick={() => setShowAdd(true)} className="gap-2" aria-label={t('team.addMember')}>
                <UserPlus className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t('team.addMember')}</span>
              </Button>
            </div>
          ) : undefined
        }
      />

      {notice ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <p className="min-w-0 flex-1">{notice}</p>
          <button
            type="button"
            aria-label={t('team.close')}
            onClick={() => setNotice(null)}
            className="rounded p-0.5 hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {!loading && members.length > 0 ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-80 md:shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              type="search"
              aria-label={t('team.searchPlaceholder')}
              placeholder={t('team.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div role="group" aria-label={t('team.roleField')} className="inline-flex self-start rounded-lg border border-border bg-surface p-0.5">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={roleFilter === item.id}
                onClick={() => setRoleFilter(item.id)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  roleFilter === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                {item.label}
                <span className={`text-xs tabular-nums ${roleFilter === item.id ? 'text-primary' : 'text-text-muted'}`}>
                  {counts[item.id]}
                </span>
              </button>
            ))}
          </div>
          {!isAdmin ? <p className="text-xs text-text-muted md:ml-auto">{t('team.adminOnlyHint')}</p> : null}
        </div>
      ) : null}

      {loading ? (
        <div className="divide-y divide-border rounded-2xl border border-border bg-surface" aria-busy>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-border motion-reduce:animate-none" />
              <div className="space-y-2">
                <div className="h-3.5 w-40 animate-pulse rounded bg-border motion-reduce:animate-none" />
                <div className="h-3 w-56 max-w-full animate-pulse rounded bg-border motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          title={t('team.emptyTitle')}
          body={t('team.emptyBody')}
          action={
            isAdmin ? (
              <Button onClick={() => setShowAdd(true)} className="gap-2">
                <UserPlus className="h-4 w-4" aria-hidden />
                {t('team.addMember')}
              </Button>
            ) : undefined
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState title={t('team.noMatches')} />
      ) : (
        <div>
          <div
            className={`hidden items-center gap-x-4 px-4 pb-2 text-xs font-medium uppercase tracking-wide text-text-muted lg:grid ${COLUMNS}`}
          >
            <span>{t('team.columnPerson')}</span>
            <span>{t('team.roleField')}</span>
            <span>{t('team.columnProjects')}</span>
            <span>{t('team.columnWorkload')}</span>
            <span>{t('team.columnJoined')}</span>
            <span />
          </div>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface [&>li:first-child]:rounded-t-2xl [&>li:last-child]:rounded-b-2xl">
            {visible.map((member) => {
              const name = member.profiles?.username || t('team.unnamed')
              const isSelf = member.user_id === viewerId
              const isOwner = member.user_id === ownerId
              const stats = member.stats || { projects: 0, open_tasks: 0, overdue_tasks: 0 }
              const canManage = isAdmin && !isSelf && !isOwner
              const joined = member.joined_at
                ? new Date(member.joined_at).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
                : ''
              return (
                <li
                  key={member.id}
                  className={`flex items-center gap-3 px-3 py-3 transition-colors duration-150 hover:bg-surface-hover sm:px-4 lg:grid lg:gap-x-4 ${COLUMNS}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar
                      src={member.profiles?.avatar_url}
                      alt={name}
                      fallback={name.slice(0, 2).toUpperCase()}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {name}
                        {isSelf ? <span className="ml-1.5 text-xs font-normal text-text-muted">({t('team.you')})</span> : null}
                      </p>
                      {member.profiles?.email ? (
                        <p className="truncate text-xs text-text-secondary">{member.profiles.email}</p>
                      ) : null}
                      <p className="mt-0.5 truncate text-xs text-text-muted lg:hidden">
                        {isOwner ? t('team.roleOwner') : member.role === 'admin' ? t('team.roleAdmin') : t('team.roleMember')}
                        {' · '}
                        {t('team.projectsCount', { count: stats.projects })}
                        {' · '}
                        {t('team.openTasksCount', { count: stats.open_tasks })}
                      </p>
                    </div>
                  </div>
                  <div className="hidden lg:block">{roleBadge(member)}</div>
                  <div className="hidden text-sm tabular-nums text-text-primary lg:block">{stats.projects}</div>
                  <div className="hidden lg:block">
                    <p className="mb-1 flex items-baseline gap-2 text-xs text-text-secondary">
                      <span>{t('team.openTasksCount', { count: stats.open_tasks })}</span>
                      {stats.overdue_tasks > 0 ? (
                        <span className="font-medium text-danger">{t('team.overdueCount', { count: stats.overdue_tasks })}</span>
                      ) : null}
                    </p>
                    <div
                      role="progressbar"
                      aria-label={t('team.columnWorkload')}
                      aria-valuemin={0}
                      aria-valuemax={maxOpen}
                      aria-valuenow={stats.open_tasks}
                      className="h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-border"
                    >
                      <div
                        className={`h-full rounded-full ${stats.overdue_tasks > 0 ? 'bg-warning' : 'bg-primary'}`}
                        style={{ width: `${Math.round((stats.open_tasks / maxOpen) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="hidden text-xs text-text-secondary lg:block">{joined}</div>
                  <div className="flex shrink-0 justify-end">
                    {canManage ? (
                      <IconMenu
                        label={`${t('team.actions')}: ${name}`}
                        items={[
                          {
                            label: member.role === 'admin' ? t('team.makeMember') : t('team.makeAdmin'),
                            onClick: () => changeRole(member, member.role === 'admin' ? 'member' : 'admin'),
                          },
                          { label: t('team.remove'), onClick: () => setRemoving(member), danger: true },
                        ]}
                      />
                    ) : (
                      <span className="h-9 w-9" aria-hidden />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <Dialog
        open={showAdd}
        title={t('team.addTitle')}
        onClose={closeAdd}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={closeAdd} disabled={addBusy}>
              {t('team.cancel')}
            </Button>
            <Button type="submit" form="add-member-form" className="w-full sm:w-auto" disabled={addBusy || !addUsername.trim()}>
              {addBusy ? t('team.adding') : t('team.addMember')}
            </Button>
          </div>
        }
      >
        <form id="add-member-form" onSubmit={handleAdd} className="space-y-5">
          {addError ? (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {addError}
            </p>
          ) : null}
          <div>
            <label htmlFor="add-member-username" className="block text-sm font-medium text-text-secondary">
              {t('team.username')}
            </label>
            <input
              id="add-member-username"
              type="text"
              required
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              value={addUsername}
              onChange={(event) => setAddUsername(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('team.usernamePlaceholder')}
            />
            <p className="mt-2 text-xs text-text-muted">{t('team.usernameHelp')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">{t('team.roleField')}</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('team.roleField')}>
              {(['member', 'admin'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  aria-pressed={addRole === role}
                  onClick={() => setAddRole(role)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    addRole === role
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}
                >
                  {role === 'admin' ? t('team.roleAdmin') : t('team.roleMember')}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-muted">{addRole === 'admin' ? t('team.roleAdminHelp') : t('team.roleMemberHelp')}</p>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={showInvite}
        title={t('team.inviteTitle')}
        onClose={closeInvite}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {inviteLink ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setInviteLink(null)
                    setInviteEmail('')
                    setInviteError(null)
                    setCopied(false)
                  }}
                >
                  {t('team.inviteAnother')}
                </Button>
                <Button type="button" className="w-full sm:w-auto" onClick={closeInvite}>
                  {t('team.done')}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={closeInvite} disabled={inviteBusy}>
                  {t('team.cancel')}
                </Button>
                <Button type="submit" form="invite-link-form" className="w-full sm:w-auto" disabled={inviteBusy || !inviteEmail.trim()}>
                  {inviteBusy ? t('team.inviteCreating') : t('team.inviteCreate')}
                </Button>
              </>
            )}
          </div>
        }
      >
        {inviteLink ? (
          <div className="space-y-4">
            <p role="status" className="flex items-center gap-2 text-sm font-medium text-success">
              <Check className="h-4 w-4" aria-hidden />
              {t('team.inviteReady')}
            </p>
            <div>
              <label htmlFor="invite-link-output" className="block text-sm font-medium text-text-secondary">
                {t('team.inviteLinkLabel')}
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="invite-link-output"
                  readOnly
                  value={inviteLink}
                  onFocus={(event) => event.currentTarget.select()}
                  className={`${fieldClass} flex-1 font-mono text-xs`}
                />
                <Button type="button" variant="secondary" onClick={copyInviteLink} className="gap-2">
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? t('team.copied') : t('team.copy')}
                </Button>
              </div>
              <p className="mt-2 text-xs text-text-muted">{t('team.inviteSendTo', { email: inviteSentTo })}</p>
            </div>
            {inviteError ? (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {inviteError}
              </p>
            ) : null}
          </div>
        ) : (
          <form id="invite-link-form" onSubmit={handleInvite} className="space-y-5" noValidate>
            {inviteError ? (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {inviteError}
              </p>
            ) : null}
            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium text-text-secondary">
                {t('team.inviteEmail')}
              </label>
              <input
                id="invite-email"
                type="email"
                required
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className={`${fieldClass} mt-1.5`}
                placeholder={t('team.inviteEmailPlaceholder')}
              />
              <p className="mt-2 text-xs text-text-muted">{t('team.inviteHelp')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">{t('team.roleField')}</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('team.roleField')}>
                {(['member', 'admin'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={inviteRole === role}
                    onClick={() => setInviteRole(role)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      inviteRole === role
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    {role === 'admin' ? t('team.roleAdmin') : t('team.roleMember')}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-text-muted">{inviteRole === 'admin' ? t('team.roleAdminHelp') : t('team.roleMemberHelp')}</p>
            </div>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        title={t('team.remove')}
        body={removing ? t('team.confirmRemoveNamed', { name: removing.profiles?.username || t('team.unnamed') }) : undefined}
        confirmLabel={t('team.remove')}
        cancelLabel={t('team.cancel')}
        busy={removeBusy}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </div>
  )
}
