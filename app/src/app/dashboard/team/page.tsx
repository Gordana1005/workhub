'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'
import useWorkspaceStore from '@/stores/useWorkspaceStore'

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
}

const fieldClass =
  'w-full max-w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export default function TeamPage() {
  const t = useTranslations('pages.people')
  const locale = useLocale()
  const { currentWorkspace } = useWorkspaceStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addUsername, setAddUsername] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadTeamMembers = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      setLoading(true)
      const response = await fetch(`/api/team?workspace_id=${currentWorkspace.id}`)
      const data = await response.json()

      if (response.ok) {
        setTeamMembers(data.members || [])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace])

  useEffect(() => {
    if (currentWorkspace) {
      loadTeamMembers()
    }
  }, [currentWorkspace, loadTeamMembers])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentWorkspace || !addUsername) return

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          username: addUsername,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setAddUsername('')
        setShowAddDialog(false)
        loadTeamMembers()
      } else {
        alert(data.error || t('team.addFailed'))
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert(t('team.addFailed'))
    }
  }

  const handleCloseAddDialog = () => {
    setShowAddDialog(false)
    setAddUsername('')
  }

  const handleRemoveMember = async (userId: string) => {
    if (!currentWorkspace) return
    if (!confirm(t('team.confirmRemove'))) return

    try {
      const response = await fetch(
        `/api/team?workspace_id=${currentWorkspace.id}&user_id=${userId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        loadTeamMembers()
      } else {
        const data = await response.json()
        alert(data.error || t('team.removeFailed'))
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert(t('team.removeFailed'))
    }
  }

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!currentWorkspace) return

    try {
      const response = await fetch(
        `/api/team?workspace_id=${currentWorkspace.id}&user_id=${userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      )

      if (response.ok) {
        loadTeamMembers()
      } else {
        const data = await response.json()
        alert(data.error || t('team.roleFailed'))
      }
    } catch (error) {
      console.error('Error updating role:', error)
      alert(t('team.roleFailed'))
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name.slice(0, 2).toUpperCase()
  }

  const filteredMembers = teamMembers.filter((member) => {
    const haystack = `${member.profiles?.username || ''} ${member.profiles?.email || ''}`.toLowerCase()
    return haystack.includes(searchQuery.toLowerCase())
  })

  const adminCount = teamMembers.filter((member) => member.role === 'admin').length
  const memberCount = teamMembers.filter((member) => member.role === 'member').length
  const dateLocale = locale === 'mk' ? 'mk' : 'en-US'

  if (!currentWorkspace) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('team.title')} description={t('team.subtitle')} />
        <EmptyState title={t('team.selectWorkspace')} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('team.title')}
        description={t('team.subtitle')}
        action={
          loading || teamMembers.length > 0 ? (
            <Button onClick={() => setShowAddDialog(true)} className="gap-2" aria-label={t('team.addMember')}>
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('team.addMember')}</span>
            </Button>
          ) : undefined
        }
      />

      <p className="text-sm text-text-secondary">
        {t('team.totalMembers')}: {teamMembers.length} · {t('team.admins')}: {adminCount} · {t('team.members')}: {memberCount}
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          placeholder={t('team.searchPlaceholder')}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className={`${fieldClass} pl-9`}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : filteredMembers.length === 0 ? (
        searchQuery ? (
          <p className="text-sm text-text-secondary">{t('team.noMatches')}</p>
        ) : (
          <EmptyState
            title={t('team.members')}
            body={t('team.subtitle')}
            action={
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                {t('team.addMember')}
              </Button>
            }
          />
        )
      ) : (
        <ul className="space-y-2">
          {filteredMembers.map((member) => {
            const name = member.profiles?.username || t('team.unnamed')
            const joined = mounted
              ? new Date(member.joined_at).toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' })
              : '…'
            return (
              <li key={member.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                <Avatar
                  src={member.profiles?.avatar_url}
                  alt={member.profiles?.username || t('team.userAlt')}
                  fallback={getInitials(member.profiles?.username || null)}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-text-primary">{name}</p>
                  {member.profiles?.email ? (
                    <p className="break-all text-sm text-text-secondary">{member.profiles.email}</p>
                  ) : null}
                  <p className="text-xs text-text-secondary">
                    {member.role === 'admin' ? t('team.roleAdmin') : t('team.roleMember')}
                    {' · '}
                    {t('team.joined', { date: joined })}
                  </p>
                </div>
                <IconMenu
                  label={name}
                  items={[
                    {
                      label: member.role === 'admin' ? t('team.makeMember') : t('team.makeAdmin'),
                      onClick: () => handleChangeRole(member.user_id, member.role === 'admin' ? 'member' : 'admin'),
                    },
                    {
                      label: t('team.remove'),
                      onClick: () => handleRemoveMember(member.user_id),
                      danger: true,
                    },
                  ]}
                />
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        open={showAddDialog}
        title={t('team.addTitle')}
        onClose={handleCloseAddDialog}
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleCloseAddDialog}>
              {t('team.cancel')}
            </Button>
            <Button type="submit" form="invite-member-form" className="flex-1" disabled={!addUsername}>
              {t('team.addMember')}
            </Button>
          </div>
        }
      >
        <form id="invite-member-form" onSubmit={handleAddMember} className="space-y-3">
          <label className="block text-sm text-text-secondary">
            {t('team.username')}
            <input
              type="text"
              required
              value={addUsername}
              onChange={(event) => setAddUsername(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('team.usernamePlaceholder')}
            />
          </label>
          <p className="text-xs text-text-secondary">{t('team.usernameHelp')}</p>
        </form>
      </Dialog>
    </div>
  )
}
