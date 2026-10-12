'use client'

/**
 * FirstProjectHero - what Home shows INSTEAD of three empty boxes when the workspace has no projects and no tasks.
 * One clear action: pick a starting point (reuses the project starters + CreateProjectDialog), with a quiet
 * "just add a task" alternative.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Briefcase, CalendarDays, FolderKanban, User, Users } from 'lucide-react'
import CreateProjectDialog from '@/components/create/CreateProjectDialog'
import QuickTaskForm from '@/components/create/QuickTaskForm'
import type { StarterId } from '@/lib/project-starters'

const CHOICES: { id: 'team' | 'personal' | 'client' | 'event'; starter: StarterId; icon: typeof Users }[] = [
  { id: 'team', starter: 'internal', icon: Users },
  { id: 'personal', starter: 'personal', icon: User },
  { id: 'client', starter: 'client', icon: Briefcase },
  { id: 'event', starter: 'event', icon: CalendarDays },
]

export default function FirstProjectHero() {
  const t = useTranslations('onboarding.hero')
  const [starter, setStarter] = useState<StarterId>('internal')
  const [projectOpen, setProjectOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)

  return (
    <section
      aria-labelledby="first-project-title"
      className="rounded-2xl border border-border bg-surface px-5 py-8 text-center sm:px-8 sm:py-12"
    >
      <div
        aria-hidden
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
      >
        <FolderKanban className="h-6 w-6" />
      </div>
      <h2 id="first-project-title" className="text-lg font-semibold text-text-primary sm:text-xl">
        {t('title')}
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-text-secondary">{t('body')}</p>

      <ul className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {CHOICES.map(({ id, starter: starterId, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => {
                setStarter(starterId)
                setProjectOpen(true)
              }}
              className="flex h-full min-h-11 w-full flex-col items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-4 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 active:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon aria-hidden className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-text-primary">{t(`choices.${id}.title`)}</span>
              <span className="text-xs leading-5 text-text-muted">{t(`choices.${id}.body`)}</span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setTaskOpen(true)}
        className="mt-5 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {t('justTask')}
      </button>

      <CreateProjectDialog open={projectOpen} onClose={() => setProjectOpen(false)} initialStarter={starter} />
      <QuickTaskForm open={taskOpen} onClose={() => setTaskOpen(false)} />
    </section>
  )
}
