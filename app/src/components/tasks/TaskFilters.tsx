'use client'

import { useTranslations } from 'next-intl'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  Sun,
  User,
  type LucideIcon,
} from 'lucide-react'
import { PRIORITIES, PRIORITY_TONE, priorityLabel } from './taskUtils'
import type { MemberOption, Priority, ProjectOption } from './types'

export type ViewId = 'all' | 'mine' | 'today' | 'upcoming' | 'overdue' | 'done'

export const VIEWS: { id: ViewId; icon: LucideIcon; labelKey: string }[] = [
  { id: 'all', icon: ListChecks, labelKey: 'viewAll' },
  { id: 'mine', icon: User, labelKey: 'viewMine' },
  { id: 'today', icon: Sun, labelKey: 'viewToday' },
  { id: 'upcoming', icon: CalendarClock, labelKey: 'viewUpcoming' },
  { id: 'overdue', icon: AlertCircle, labelKey: 'viewOverdue' },
  { id: 'done', icon: CheckCircle2, labelKey: 'viewDone' },
]

const selectClass =
  'h-9 w-full rounded-lg border border-border bg-secondary px-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

const sectionTitle = 'mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted'

interface TaskFiltersProps {
  /** `rail`: always-visible left column (saved views + filters). `sheet`: filters only, for a dialog. */
  variant: 'rail' | 'sheet'
  view: ViewId
  onView: (view: ViewId) => void
  counts: Record<ViewId, number>
  projects: ProjectOption[]
  projectCounts: Record<string, number>
  projectId: string
  onProject: (id: string) => void
  members: MemberOption[]
  assigneeId: string
  onAssignee: (id: string) => void
  currentUserId: string
  priority: '' | Priority
  onPriority: (priority: '' | Priority) => void
  onClear: () => void
  hasFilters: boolean
}

export default function TaskFilters({
  variant,
  view,
  onView,
  counts,
  projects,
  projectCounts,
  projectId,
  onProject,
  members,
  assigneeId,
  onAssignee,
  currentUserId,
  priority,
  onPriority,
  onClear,
  hasFilters,
}: TaskFiltersProps) {
  const t = useTranslations('pages.tasks')
  const rail = variant === 'rail'

  return (
    <div className="space-y-5">
      {rail ? (
        <nav aria-label={t('views')} className="space-y-0.5">
          {VIEWS.map(({ id, icon: Icon, labelKey }) => {
            const active = view === id
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => onView(id)}
                className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-left">{t(labelKey)}</span>
                <span
                  className={`text-xs tabular-nums ${
                    id === 'overdue' && counts.overdue > 0 && !active ? 'font-semibold text-danger' : 'text-text-muted'
                  }`}
                >
                  {counts[id]}
                </span>
              </button>
            )
          })}
        </nav>
      ) : null}

      <section>
        <h3 className={sectionTitle}>{t('project')}</h3>
        {rail ? (
          <div className="space-y-0.5">
            <button
              type="button"
              aria-pressed={!projectId}
              onClick={() => onProject('')}
              className={`flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                !projectId
                  ? 'bg-surface-hover font-medium text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-left">{t('allProjects')}</span>
            </button>
            {projects.map((project) => {
              const active = projectId === project.id
              return (
                <button
                  key={project.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onProject(active ? '' : project.id)}
                  className={`flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    active
                      ? 'bg-surface-hover font-medium text-text-primary'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-text-muted"
                    style={project.color ? { backgroundColor: project.color } : undefined}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-left">{project.name}</span>
                  <span className="text-xs tabular-nums text-text-muted">{projectCounts[project.id] || 0}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <select
            aria-label={t('project')}
            value={projectId}
            onChange={(event) => onProject(event.target.value)}
            className={selectClass}
          >
            <option value="">{t('allProjects')}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
      </section>

      <section>
        <h3 className={sectionTitle}>{t('assignee')}</h3>
        <select
          aria-label={t('assignee')}
          value={assigneeId}
          onChange={(event) => onAssignee(event.target.value)}
          className={selectClass}
        >
          <option value="">{t('everyone')}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.username}
              {member.id === currentUserId ? ` (${t('you')})` : ''}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h3 className={sectionTitle}>{t('priority')}</h3>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITIES.map((value) => {
            const active = priority === value
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => onPriority(active ? '' : value)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${PRIORITY_TONE[value].dot}`} aria-hidden />
                {priorityLabel(t, value)}
              </button>
            )
          })}
        </div>
      </section>

      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md px-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t('clearFilters')}
        </button>
      ) : null}
    </div>
  )
}
