'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Avatar } from '@/components/ui/Avatar'
import { IconMenu } from '@/components/ui/IconMenu'
import {
  daysUntil,
  parseDay,
  progressOf,
  readableOn,
  statusDotClass,
  statusKey,
  type ProjectMemberPreview,
  type ProjectSummary,
} from './projectUtils'

/** Column template shared by the list rows and the list header (lg and up). */
export const PROJECT_LIST_COLUMNS =
  'lg:grid-cols-[minmax(0,2.4fr)_8rem_minmax(9rem,1.2fr)_7rem_9rem_2.5rem]'

export function useProjectStatusLabel() {
  const t = useTranslations('pages.projects')
  return (status: string) => {
    const key = statusKey(status)
    return key ? t(`status.${key}`) : status.replace(/[-_]/g, ' ')
  }
}

export function ProjectTile({ project, size = 'md' }: { project: Pick<ProjectSummary, 'name' | 'color' | 'logo_url'>; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'
  if (project.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={project.logo_url} alt="" className={`${box} shrink-0 rounded-xl border border-border object-cover`} />
  }
  const background = project.color || '#667eea'
  return (
    <div
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center rounded-xl font-semibold`}
      style={{ backgroundColor: background, color: readableOn(background) }}
    >
      {project.name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}

export function AvatarStack({
  members,
  total,
  max = 4,
}: {
  members: ProjectMemberPreview[]
  total?: number
  max?: number
}) {
  const shown = members.slice(0, max)
  const extra = Math.max(0, (total ?? members.length) - shown.length)
  if (shown.length === 0) return null
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((member) => (
        <Avatar
          key={member.id}
          src={member.avatar_url}
          alt={member.username || '?'}
          fallback={(member.username || '?').slice(0, 2).toUpperCase()}
          size="sm"
          className="h-7 w-7 text-[10px] ring-2 ring-surface"
        />
      ))}
      {extra > 0 ? (
        <span className="relative z-0 inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-border bg-background px-1 text-[10px] font-medium text-text-secondary ring-2 ring-surface">
          +{extra}
        </span>
      ) : null}
    </div>
  )
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1.5 w-full overflow-hidden rounded-full bg-border"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${percent >= 100 ? 'bg-success' : 'bg-primary'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

/** "Due Oct 30" / "Due today" / "Overdue · Oct 3", coloured by urgency. Renders nothing without an end date. */
export function DueLabel({ endDate, finished, className = '' }: { endDate: string | null; finished?: boolean; className?: string }) {
  const t = useTranslations('pages.projects')
  const locale = useLocale()
  const day = parseDay(endDate)
  if (!day) return null
  const date = day.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  const diff = daysUntil(endDate)
  if (!finished && diff !== null && diff < 0) {
    return <span className={`font-medium text-danger ${className}`}>{t('overdueOn', { date })}</span>
  }
  if (!finished && diff === 0) {
    return <span className={`font-medium text-warning ${className}`}>{t('dueToday')}</span>
  }
  return <span className={`text-text-muted ${className}`}>{t('dueOn', { date })}</span>
}

interface ProjectCardProps {
  project: ProjectSummary
  view?: 'grid' | 'list'
  onEdit?: (project: ProjectSummary) => void
  onDelete?: (project: ProjectSummary) => void
}

export default function ProjectCard({ project, view = 'grid', onEdit, onDelete }: ProjectCardProps) {
  const t = useTranslations('pages.projects')
  const statusLabel = useProjectStatusLabel()
  const total = project.taskCount ?? 0
  const done = project.completedTaskCount ?? 0
  const percent = progressOf(done, total)
  const finished = statusKey(project.status) === 'completed' || statusKey(project.status) === 'archived'
  const members = project.members ?? []

  const menuItems = [
    ...(onEdit ? [{ label: t('editProject'), onClick: () => onEdit(project) }] : []),
    ...(onDelete ? [{ label: t('deleteProject'), onClick: () => onDelete(project), danger: true }] : []),
  ]
  const menu =
    menuItems.length > 0 ? (
      <div className="pointer-events-auto relative">
        <IconMenu
          label={`${t('projectActions')}: ${project.name}`}
          items={menuItems}
          buttonClassName="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-surface-hover sm:h-9 sm:w-9"
        />
      </div>
    ) : null

  const overlay = (
    <Link
      href={`/dashboard/projects/${project.id}`}
      aria-label={project.name}
      className="absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    />
  )

  const statusLine = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(project.status)}`} />
      <span className="truncate">{statusLabel(project.status)}</span>
    </span>
  )

  if (view === 'list') {
    return (
      <div className="group relative transition-colors duration-150 hover:bg-surface-hover active:bg-surface-hover">
        {overlay}
        <div className={`pointer-events-none relative flex min-h-[4.25rem] items-center gap-3 px-3 py-3 sm:px-4 lg:grid lg:gap-x-4 ${PROJECT_LIST_COLUMNS}`}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ProjectTile project={project} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-text-primary">{project.name}</h2>
              <p className="truncate text-xs text-text-muted lg:hidden">
                {statusLabel(project.status)}
                {total > 0 ? ` · ${t('tasksProgress', { done, total })}` : ''}
              </p>
              {project.description ? (
                <p className="hidden truncate text-xs text-text-secondary lg:block">{project.description}</p>
              ) : null}
            </div>
          </div>
          <div className="hidden min-w-0 text-sm text-text-secondary lg:block">{statusLine}</div>
          <div className="hidden lg:block">
            {total > 0 ? (
              <>
                <p className="mb-1 text-xs text-text-secondary">
                  {t('tasksProgress', { done, total })}
                </p>
                <ProgressBar percent={percent} label={t('completion')} />
              </>
            ) : (
              <p className="text-xs text-text-muted">{t('noTasksYet')}</p>
            )}
          </div>
          <div className="hidden lg:block">
            <AvatarStack members={members} total={project.memberCount} />
          </div>
          <div className="hidden text-xs lg:block">
            <DueLabel endDate={project.end_date} finished={finished} />
          </div>
          <div className="flex shrink-0 items-center justify-end">{menu}</div>
        </div>
      </div>
    )
  }

  return (
    <article className="group relative flex rounded-2xl border border-border bg-surface transition-colors duration-150 hover:border-primary/40 hover:bg-surface-hover active:bg-surface-hover">
      {overlay}
      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <ProjectTile project={project} />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 break-words text-base font-semibold leading-snug text-text-primary">{project.name}</h2>
            <p className="mt-0.5 text-xs text-text-muted">{statusLine}</p>
          </div>
          {menu ? <div className="-mr-2 -mt-2">{menu}</div> : null}
        </div>

        {project.description ? (
          <p className="line-clamp-2 text-sm leading-snug text-text-secondary">{project.description}</p>
        ) : null}

        <div className="mt-auto space-y-3 pt-1">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-text-secondary">
              <span className="truncate">{total > 0 ? t('tasksProgress', { done, total }) : t('noTasksYet')}</span>
              {total > 0 ? <span className="shrink-0 tabular-nums">{percent}%</span> : null}
            </div>
            <ProgressBar percent={percent} label={t('completion')} />
          </div>
          <div className="flex min-h-6 items-center justify-between gap-3 text-xs">
            <AvatarStack members={members} total={project.memberCount} />
            <DueLabel endDate={project.end_date} finished={finished} className="ml-auto" />
          </div>
        </div>
      </div>
    </article>
  )
}
