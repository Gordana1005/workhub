'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { AlertTriangle, Check, Copy, Mail, RefreshCw, Search, UserPlus, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import {
  INVITE_MESSAGE_MAX,
  buildJoinLink,
  invitationState,
  normalizeInviteEmail,
  type InvitationState,
} from '@/lib/invitations'
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

interface PendingInvitation {
  id: string
  email: string
  role: 'admin' | 'member'
  token: string
  status?: string | null
  created_at: string | null
  expires_at: string | null
  last_sent_at?: string | null
  state: InvitationState
}

interface InviteResult {
  email: string
  link: string
  emailSent: boolean
  emailError?: string
}

type RoleFilter = 'all' | 'admin' | 'member'

const COLUMNS = 'lg:grid-cols-[minmax(0,2.2fr)_7rem_6rem_minmax(10rem,1.4fr)_7rem_2.5rem]'

const fieldClass =
  'min-h-11 w-full min-w-0 rounded-lg border border-border-control bg-secondary px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:min-h-10 sm:text-sm'

export default function TeamPage() {
  const t = useTranslations('pages.people')
  const locale = useLocale()
  const toast = useToast()
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
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<PendingInvitation | null>(null)
  const [revokeBusy, setRevokeBusy] = useState(false)

  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)

  const workspaceId = currentWorkspace?.id
  const isAdmin = viewerRole === 'admin'
  // The role the workspace list already told us: lets the invitations request start together with the
  // members request instead of waiting for it (the server still enforces the real role).
  const mayInvite = isAdmin || (viewerRole === null && currentWorkspace?.userRole === 'admin')

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

  const loadInvitations = useCallback(async () => {
    if (!workspaceId) return
    try {
      const response = await fetch(`/api/invitations?workspace_id=${workspaceId}`, { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) return
      const rows: Omit<PendingInvitation, 'state'>[] = data.invitations || []
      setInvitations(
        rows
          .map((row) => ({ ...row, state: invitationState(row) }))
          .filter((row) => row.state === 'pending' || row.state === 'expired')
      )
    } catch (error) {
      console.error('Error loading invitations:', error)
    }
  }, [workspaceId])

  useEffect(() => {
    setInvitations([])
    if (workspaceId && mayInvite) loadInvitations()
  }, [workspaceId, mayInvite, loadInvitations])

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
    setInviteMessage('')
    setInviteError(null)
    setInviteResult(null)
    setCopied(false)
  }

  const inviteErrorText = (code?: string) => {
    switch (code) {
      case 'invalid_email':
        return t('team.errInvalidEmail')
      case 'already_member':
        return t('team.errAlreadyMember')
      case 'already_invited':
        return t('team.errAlreadyInvited')
      case 'rate_limited':
        return t('team.errRateLimited')
      default:
        return t('team.inviteFailed')
    }
  }

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault()
    if (!workspaceId || inviteBusy) return
    const email = normalizeInviteEmail(inviteEmail)
    if (!email) {
      setInviteError(t('team.inviteEmailInvalid'))
      return
    }
    setInviteBusy(true)
    setInviteError(null)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, email, role: inviteRole, message: inviteMessage.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setInviteError(inviteErrorText(data.code))
        if (data.code === 'already_invited') loadInvitations()
        return
      }
      const token = data.invitation?.token
      setInviteResult({
        email,
        link: data.link || data.joinLink || (token ? buildJoinLink(window.location.origin, token) : ''),
        emailSent: Boolean(data.emailSent),
        emailError: data.emailError,
      })
      setCopied(false)
      loadInvitations()
    } catch {
      setInviteError(t('team.inviteFailed'))
    } finally {
      setInviteBusy(false)
    }
  }

  const copyInviteLink = async () => {
    if (!inviteResult?.link) return
    try {
      await navigator.clipboard.writeText(inviteResult.link)
      setCopied(true)
      setInviteError(null)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setInviteError(t('team.copyFailed'))
    }
  }

  const copyPendingLink = async (invitation: PendingInvitation) => {
    try {
      await navigator.clipboard.writeText(buildJoinLink(window.location.origin, invitation.token))
      toast.success(t('team.linkCopied'))
    } catch {
      toast.error(t('team.copyFailed'))
    }
  }

  const resendInvitation = async (invitation: PendingInvitation) => {
    if (resendingId) return
    setResendingId(invitation.id)
    try {
      const response = await fetch('/api/invitations/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invitation.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(
          data.code === 'resend_cooldown'
            ? t('team.resendWait')
            : data.code === 'rate_limited'
              ? t('team.errRateLimited')
              : t('team.resendFailed')
        )
        return
      }
      if (data.emailSent) toast.success(t('team.resent', { email: invitation.email }))
      else toast.warning(t('team.resentNoEmail', { email: invitation.email }), { duration: 9000 })
      await loadInvitations()
    } catch {
      toast.error(t('team.resendFailed'))
    } finally {
      setResendingId(null)
    }
  }

  const confirmRevoke = async () => {
    if (!revoking) return
    setRevokeBusy(true)
    try {
      const response = await fetch(`/api/invitations?id=${encodeURIComponent(revoking.id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('revoke')
      setInvitations((list) => list.filter((item) => item.id !== revoking.id))
      toast.success(t('team.revoked'))
    } catch {
      toast.error(t('team.revokeFailed'))
      loadInvitations()
    } finally {
      setRevokeBusy(false)
      setRevoking(null)
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
              <Button
                variant="secondary"
                onClick={() => setShowInvite(true)}
                className="h-11 w-11 gap-2 px-0 sm:h-10 sm:w-auto sm:px-4"
                aria-label={t('team.inviteByEmail')}
              >
                <Mail className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                <span className="hidden sm:inline">{t('team.inviteByEmail')}</span>
              </Button>
              <Button
                onClick={() => setShowAdd(true)}
                className="h-11 w-11 gap-2 px-0 sm:h-10 sm:w-auto sm:px-4"
                aria-label={t('team.addMember')}
              >
                <UserPlus className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
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
            className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-danger/10 active:bg-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
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
              enterKeyHint="search"
              className="h-11 w-full rounded-lg border border-border-control bg-secondary pl-9 pr-3 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:h-10 sm:text-sm"
            />
          </div>
          <div role="group" aria-label={t('team.roleField')} className="flex w-full rounded-lg border border-border bg-surface p-0.5 md:inline-flex md:w-auto md:self-start">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={roleFilter === item.id}
                onClick={() => setRoleFilter(item.id)}
                className={`inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:h-8 md:flex-none ${
                  roleFilter === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                <span className="truncate">{item.label}</span>
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
              <Button size="lg" onClick={() => setShowAdd(true)} className="gap-2">
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
          <ul className="space-y-2.5 lg:space-y-0 lg:divide-y lg:divide-border lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:[&>li:first-child]:rounded-t-2xl lg:[&>li:last-child]:rounded-b-2xl">
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
                  className={`flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 transition-colors duration-150 hover:bg-surface-hover sm:px-4 lg:grid lg:min-h-0 lg:gap-x-4 lg:rounded-none lg:border-0 lg:bg-transparent ${COLUMNS}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar
                      src={member.profiles?.avatar_url}
                      alt={name}
                      fallback={name.slice(0, 2).toUpperCase()}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-text-primary sm:text-sm">
                        {name}
                        {isSelf ? <span className="ml-1.5 text-xs font-normal text-text-muted">({t('team.you')})</span> : null}
                      </p>
                      {member.profiles?.email ? (
                        <p className="truncate text-xs text-text-secondary">{member.profiles.email}</p>
                      ) : null}
                      <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted lg:hidden">
                        {isOwner || member.role === 'admin' ? (
                          <Badge size="sm" variant="blue">
                            {isOwner ? t('team.roleOwner') : t('team.roleAdmin')}
                          </Badge>
                        ) : (
                          <span>{t('team.roleMember')}</span>
                        )}
                        <span className="min-w-0 truncate">
                          {t('team.projectsCount', { count: stats.projects })}
                          {' · '}
                          {t('team.openTasksCount', { count: stats.open_tasks })}
                        </span>
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
                        buttonClassName="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-surface-hover active:bg-tertiary lg:h-9 lg:w-9"
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
                      <span className="h-11 w-11 lg:h-9 lg:w-9" aria-hidden />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {isAdmin && !loading && invitations.length > 0 ? (
        <section aria-labelledby="pending-invitations-title" className="space-y-3 pt-2">
          <div>
            <h2 id="pending-invitations-title" className="text-base font-semibold text-text-primary">
              {t('team.pendingTitle')}
              <span className="ml-2 text-sm font-normal tabular-nums text-text-muted">{invitations.length}</span>
            </h2>
            <p className="text-sm text-text-secondary">{t('team.pendingSubtitle')}</p>
          </div>
          <ul className="space-y-2.5 lg:space-y-0 lg:divide-y lg:divide-border lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:[&>li:first-child]:rounded-t-2xl lg:[&>li:last-child]:rounded-b-2xl">
            {invitations.map((invitation) => {
              const expired = invitation.state === 'expired'
              const shortDate = (value: string | null) =>
                value ? new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
              return (
                <li
                  key={invitation.id}
                  className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 transition-colors duration-150 hover:bg-surface-hover sm:px-4 lg:rounded-none lg:border-0 lg:bg-transparent"
                >
                  <Avatar alt={invitation.email} fallback={invitation.email.slice(0, 2).toUpperCase()} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-text-primary sm:text-sm">{invitation.email}</p>
                    <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
                      <Badge size="sm" variant={expired ? 'danger' : 'warning'}>
                        {expired ? t('team.statusExpired') : t('team.statusPending')}
                      </Badge>
                      <span>{invitation.role === 'admin' ? t('team.roleAdmin') : t('team.roleMember')}</span>
                      <span aria-hidden>·</span>
                      <span>{t('team.pendingInvited', { date: shortDate(invitation.created_at) })}</span>
                      <span aria-hidden>·</span>
                      <span className={expired ? 'text-danger' : undefined}>
                        {expired
                          ? t('team.pendingExpired', { date: shortDate(invitation.expires_at) })
                          : t('team.pendingExpires', { date: shortDate(invitation.expires_at) })}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 justify-end">
                    <IconMenu
                      buttonClassName="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-surface-hover active:bg-tertiary lg:h-9 lg:w-9"
                      label={t('team.invitationActions', { email: invitation.email })}
                      items={[
                        {
                          label: t('team.resend'),
                          icon: <RefreshCw />,
                          disabled: resendingId === invitation.id,
                          onClick: () => resendInvitation(invitation),
                        },
                        { label: t('team.copyLink'), icon: <Copy />, onClick: () => copyPendingLink(invitation) },
                        {
                          label: t('team.revoke'),
                          icon: <X />,
                          danger: true,
                          separatorBefore: true,
                          onClick: () => setRevoking(invitation),
                        },
                      ]}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <Dialog
        open={showAdd}
        title={t('team.addTitle')}
        onClose={closeAdd}
        footer={
          <>
            <Button type="button" variant="secondary" className="h-11 sm:h-10" onClick={closeAdd} disabled={addBusy}>
              {t('team.cancel')}
            </Button>
            <Button type="submit" form="add-member-form" className="h-12 sm:h-10" disabled={addBusy || !addUsername.trim()}>
              {addBusy ? t('team.adding') : t('team.addMember')}
            </Button>
          </>
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
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
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
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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
          inviteResult ? (
            <>
              <Button
                type="button"
                variant="secondary"
                className="h-11 sm:h-10"
                onClick={() => {
                  setInviteResult(null)
                  setInviteEmail('')
                  setInviteMessage('')
                  setInviteError(null)
                  setCopied(false)
                }}
              >
                {t('team.inviteAnother')}
              </Button>
              <Button type="button" className="h-12 sm:h-10" onClick={closeInvite}>
                {t('team.done')}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" className="h-11 sm:h-10" onClick={closeInvite} disabled={inviteBusy}>
                {t('team.cancel')}
              </Button>
              <Button type="submit" form="invite-email-form" className="h-12 sm:h-10" loading={inviteBusy} disabled={!inviteEmail.trim()}>
                {inviteBusy ? t('team.inviteCreating') : t('team.inviteCreate')}
              </Button>
            </>
          )
        }
      >
        {inviteResult ? (
          <div className="space-y-4">
            {inviteResult.emailSent ? (
              <div role="status" className="flex items-start gap-3">
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <Check className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-text-primary">
                    {t('team.inviteSent', { email: inviteResult.email })}
                  </p>
                  <p className="mt-0.5 text-sm text-text-secondary">{t('team.inviteSentBody')}</p>
                </div>
              </div>
            ) : (
              <div role="status" className="flex items-start gap-3">
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-text-primary">
                    {t('team.inviteCreatedNoEmail', { email: inviteResult.email })}
                  </p>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {inviteResult.emailError === 'rate_limited' ? t('team.inviteNoEmailLimited') : t('team.inviteNoEmailBody')}
                  </p>
                </div>
              </div>
            )}
            <div>
              <label htmlFor="invite-link-output" className="block text-sm font-medium text-text-secondary">
                {t('team.inviteLinkLabel')}
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  id="invite-link-output"
                  readOnly
                  value={inviteResult.link}
                  onFocus={(event) => event.currentTarget.select()}
                  className={`${fieldClass} flex-1 font-mono text-xs`}
                />
                <Button
                  type="button"
                  variant={inviteResult.emailSent ? 'secondary' : 'primary'}
                  onClick={copyInviteLink}
                  className="h-11 gap-2 sm:h-10"
                >
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? t('team.copied') : t('team.copyLink')}
                </Button>
              </div>
            </div>
            {inviteError ? (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {inviteError}
              </p>
            ) : null}
          </div>
        ) : (
          <form id="invite-email-form" onSubmit={handleInvite} className="space-y-5" noValidate>
            {inviteError ? (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {inviteError}
              </p>
            ) : null}
            <Field label={t('team.inviteEmail')} hint={t('team.inviteHelp')} required>
              <Input
                type="email"
                autoFocus
                autoComplete="off"
                enterKeyHint="next"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder={t('team.inviteEmailPlaceholder')}
              />
            </Field>
            <div>
              <p className="text-sm font-medium text-text-primary">{t('team.roleField')}</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('team.roleField')}>
                {(['member', 'admin'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={inviteRole === role}
                    onClick={() => setInviteRole(role)}
                    className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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
            <Field label={t('team.inviteMessage')} optional>
              <Textarea
                rows={3}
                maxLength={INVITE_MESSAGE_MAX}
                value={inviteMessage}
                onChange={(event) => setInviteMessage(event.target.value)}
                placeholder={t('team.inviteMessagePlaceholder')}
              />
            </Field>
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

      <ConfirmDialog
        open={Boolean(revoking)}
        title={t('team.revoke')}
        body={revoking ? t('team.confirmRevoke', { email: revoking.email }) : undefined}
        confirmLabel={t('team.revokeLabel')}
        cancelLabel={t('team.cancel')}
        busy={revokeBusy}
        onConfirm={confirmRevoke}
        onClose={() => setRevoking(null)}
      />
    </div>
  )
}
