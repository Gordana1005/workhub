'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Search } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'

export interface ProjectMember {
  id: string
  username: string
  avatar_url: string | null
  role: string
}

export interface WorkspacePerson {
  id: string
  username: string
  avatar_url: string | null
}

export default function ProjectPeople({
  members,
  openTaskCounts,
  workspaceMembers,
  isAdmin,
  onAdd,
  onRemove,
}: {
  members: ProjectMember[]
  openTaskCounts: Record<string, number>
  workspaceMembers: WorkspacePerson[]
  /** Only workspace admins may add or remove people (the API enforces the same rule). */
  isAdmin: boolean
  onAdd: (userId: string) => Promise<void>
  onRemove: (userId: string) => Promise<void>
}) {
  const t = useTranslations('pages.projects')
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<ProjectMember | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)

  const roleLabel = (role: string) => (role === 'admin' ? t('roles.admin') : role === 'owner' ? t('roles.owner') : t('roles.member'))

  const available = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return workspaceMembers
      .filter((person) => !members.some((member) => member.id === person.id))
      .filter((person) => !needle || (person.username || '').toLowerCase().includes(needle))
  }, [workspaceMembers, members, search])

  const everyoneAdded = workspaceMembers.every((person) => members.some((member) => member.id === person.id))

  const closeAdd = () => {
    setAdding(false)
    setSearch('')
    setError(null)
  }

  const add = async (userId: string) => {
    setBusyId(userId)
    setError(null)
    try {
      await onAdd(userId)
    } catch (err) {
      setError(t('addMemberFailed', { error: err instanceof Error ? err.message : t('unknownError') }))
    } finally {
      setBusyId(null)
    }
  }

  const confirmRemove = async () => {
    if (!removing) return
    setRemoveBusy(true)
    try {
      await onRemove(removing.id)
      setRemoving(null)
    } catch (err) {
      setRemoving(null)
      setError(t('removeMemberFailed', { error: err instanceof Error ? err.message : t('unknownError') }))
    } finally {
      setRemoveBusy(false)
    }
  }

  const addButton = isAdmin ? (
    <Button type="button" variant="secondary" className="shrink-0 gap-2" onClick={() => setAdding(true)}>
      <Plus className="h-4 w-4" aria-hidden />
      {t('addMember')}
    </Button>
  ) : null

  return (
    <section className="min-w-0 space-y-4" aria-label={t('projectTeam')}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-base font-semibold text-text-primary">
          {t('projectTeam')} <span className="font-normal text-text-muted">{members.length}</span>
        </h2>
        {addButton}
      </div>

      {error && !adding ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {members.length === 0 ? (
        <EmptyState title={t('noMembers')} body={isAdmin ? t('noMembersAdminBody') : t('noMembersBody')} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {members.map((member) => {
            const name = member.username || t('unknownUser')
            const open = openTaskCounts[member.id] || 0
            return (
              <li key={member.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                <Avatar src={member.avatar_url} alt={name} fallback={name.slice(0, 2).toUpperCase()} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{name}</p>
                  <p className="truncate text-xs text-text-muted">
                    {roleLabel(member.role)} · {t('openTasksCount', { count: open })}
                  </p>
                </div>
                {isAdmin ? (
                  <IconMenu
                    label={`${t('memberActions')}: ${name}`}
                    items={[{ label: t('removeMember'), onClick: () => setRemoving(member), danger: true }]}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        open={adding}
        title={t('addMemberTitle')}
        onClose={closeAdd}
        footer={
          <Button type="button" variant="secondary" className="w-full sm:ml-auto sm:w-auto" onClick={closeAdd}>
            {t('done')}
          </Button>
        }
      >
        <div className="space-y-3">
          {error ? (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {everyoneAdded ? (
            <p className="text-sm text-text-secondary">{t('allMembersAdded')}</p>
          ) : (
            <>
              {workspaceMembers.length > 6 ? (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label={t('searchPeople')}
                    placeholder={t('searchPeople')}
                    className="h-10 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ) : null}
              <ul className="divide-y divide-border rounded-xl border border-border">
                {available.length === 0 ? (
                  <li className="px-3 py-4 text-center text-sm text-text-muted">{t('noPeopleMatch')}</li>
                ) : (
                  available.map((person) => {
                    const name = person.username || t('unknownUser')
                    return (
                      <li key={person.id} className="flex items-center gap-3 px-3 py-2.5">
                        <Avatar src={person.avatar_url} alt={name} fallback={name.slice(0, 2).toUpperCase()} size="sm" />
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{name}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busyId !== null}
                          onClick={() => add(person.id)}
                        >
                          {busyId === person.id ? t('saving') : t('addShort')}
                        </Button>
                      </li>
                    )
                  })
                )}
              </ul>
            </>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        title={t('removeMember')}
        body={removing ? t('removeMemberConfirmNamed', { name: removing.username || t('unknownUser') }) : undefined}
        confirmLabel={t('removeMemberShort')}
        cancelLabel={t('cancel')}
        busy={removeBusy}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </section>
  )
}
