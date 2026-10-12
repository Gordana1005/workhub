'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BarChart3, ChevronRight, CheckSquare, FileText, Plus, Target, Timer, type LucideIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import CreateProjectDialog from '@/components/create/CreateProjectDialog'
import ProjectCard from '@/components/projects/ProjectCard'
import { statusRank, type ProjectSummary } from '@/components/projects/projectUtils'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { WorkspaceTile, useWorkspaceCategoryLabel } from './WorkspaceTile'

interface Person {
  id: string
  user_id: string
  role: string
  profiles: { username: string | null; avatar_url: string | null } | null
}

const SHORTCUTS: { href: string; navKey: 'tasks' | 'plan' | 'notes' | 'time' | 'reports'; icon: LucideIcon }[] = [
  { href: '/dashboard/tasks', navKey: 'tasks', icon: CheckSquare },
  { href: '/dashboard/plans', navKey: 'plan', icon: Target },
  { href: '/dashboard/notes', navKey: 'notes', icon: FileText },
  { href: '/dashboard/time-tracker', navKey: 'time', icon: Timer },
  { href: '/dashboard/reports', navKey: 'reports', icon: BarChart3 },
]

export default function WorkspaceOverview({
  id,
  name,
  role,
  members,
  owner,
  color,
  category,
  description,
}: {
  id: string
  name: string
  role: string
  members: number
  owner: string
  color?: string | null
  category?: string | null
  description?: string | null
}) {
  const t = useTranslations('pages.people')
  const tNav = useTranslations('nav')
  const categoryLabel = useWorkspaceCategoryLabel()
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [people, setPeople] = useState<Person[] | null>(null)
  const [counts, setCounts] = useState<{ projectCount: number; taskCount: number } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const synced = useRef(false)

  // Opening a workspace's overview makes it the active one (once), so "New project" and the shortcuts act on it.
  useEffect(() => {
    if (synced.current || currentWorkspace?.id === id) {
      synced.current = true
      return
    }
    const target = workspaces.find((workspace) => workspace.id === id)
    if (target) {
      synced.current = true
      setCurrentWorkspace(target)
    }
  }, [id, workspaces, currentWorkspace?.id, setCurrentWorkspace])

  useEffect(() => {
    let cancelled = false
    const load = async (url: string) => {
      try {
        const response = await fetch(url)
        return response.ok ? await response.json() : null
      } catch {
        return null
      }
    }
    Promise.all([
      load(`/api/projects?workspace_id=${id}`),
      load(`/api/team?workspace_id=${id}`),
      load(`/api/workspaces/${id}/stats`),
    ]).then(([projectData, teamData, statsData]) => {
      if (cancelled) return
      setProjects(projectData?.projects || [])
      setPeople(teamData?.members || [])
      if (statsData) setCounts({ projectCount: statsData.projectCount || 0, taskCount: statsData.taskCount || 0 })
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const recent = useMemo(
    () =>
      (projects || [])
        .map((project, index) => ({ project, index }))
        .sort((a, b) => statusRank(a.project.status) - statusRank(b.project.status) || a.index - b.index)
        .slice(0, 6)
        .map((entry) => entry.project),
    [projects]
  )

  const roleLabel = role === 'admin' ? t('team.roleAdmin') : t('team.roleMember')
  const facts = [
    t('overview.members', { count: members }),
    counts ? t('overview.projectsCount', { count: counts.projectCount }) : null,
    counts ? t('overview.tasksCount', { count: counts.taskCount }) : null,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3 sm:gap-4">
        <WorkspaceTile name={name} color={color} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="line-clamp-2 break-words text-xl font-semibold tracking-tight text-text-primary sm:text-2xl">{name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
            {category ? <span>{categoryLabel(category)}</span> : null}
            <Badge size="sm" variant={role === 'admin' ? 'blue' : 'neutral'}>
              {roleLabel}
            </Badge>
            <span className="min-w-0 break-words">{t('overview.owner', { name: owner || t('overview.unknownOwner') })}</span>
          </p>
          <p className="mt-1 text-sm text-text-muted">{facts.join(' · ')}</p>
          {description ? (
            <p className="mt-2 line-clamp-2 max-w-3xl break-words text-sm text-text-secondary">{description}</p>
          ) : null}
        </div>
        <Button
          className="h-11 w-11 shrink-0 gap-2 px-0 sm:h-10 sm:w-auto sm:px-4"
          onClick={() => setShowCreate(true)}
          aria-label={t('overview.createProject')}
        >
          <Plus className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
          <span className="hidden sm:inline">{t('overview.createProject')}</span>
        </Button>
      </header>

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="min-w-0 space-y-3 xl:col-span-8" aria-labelledby="overview-projects">
          <div className="flex items-center justify-between gap-3">
            <h2 id="overview-projects" className="text-base font-semibold text-text-primary">
              {t('overview.recentProjects')}
            </h2>
            {recent.length > 0 ? (
              <Link
                href="/dashboard/projects"
                className="-mr-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-primary hover:underline active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('overview.viewAll')}
              </Link>
            ) : null}
          </div>

          {projects === null ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4" aria-busy>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              title={t('overview.noProjectsTitle')}
              body={t('overview.noProjectsBody')}
              action={
                <Button variant="secondary" size="lg" className="gap-2" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('overview.createProject')}
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
              {recent.map((project) => (
                <ProjectCard key={project.id} project={project} view="grid" />
              ))}
            </div>
          )}
        </section>

        <div className="min-w-0 space-y-6 xl:col-span-4">
          <section className="min-w-0 space-y-3" aria-labelledby="overview-people">
            <div className="flex items-center justify-between gap-3">
              <h2 id="overview-people" className="text-base font-semibold text-text-primary">
                {t('overview.people')}
              </h2>
              <Link
                href="/dashboard/team"
                className="-mr-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-primary hover:underline active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('overview.viewAll')}
              </Link>
            </div>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {(people || []).slice(0, 6).map((person) => {
                const personName = person.profiles?.username || t('team.unnamed')
                return (
                  <li key={person.id} className="flex min-h-12 items-center gap-3 px-3 py-2.5">
                    <Avatar
                      src={person.profiles?.avatar_url}
                      alt={personName}
                      fallback={personName.slice(0, 2).toUpperCase()}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{personName}</span>
                    <span className="shrink-0 text-xs text-text-muted">
                      {person.role === 'admin' ? t('team.roleAdmin') : t('team.roleMember')}
                    </span>
                  </li>
                )
              })}
              {people === null ? (
                <li className="px-3 py-4 text-sm text-text-muted" aria-busy>
                  …
                </li>
              ) : null}
            </ul>
          </section>

          <section className="min-w-0 space-y-3" aria-labelledby="overview-shortcuts">
            <h2 id="overview-shortcuts" className="text-base font-semibold text-text-primary">
              {t('overview.shortcuts')}
            </h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface [&>li:first-child]:rounded-t-2xl [&>li:last-child]:rounded-b-2xl">
              {SHORTCUTS.map(({ href, navKey, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{tNav(navKey)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
