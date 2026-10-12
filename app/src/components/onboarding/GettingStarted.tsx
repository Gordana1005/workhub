'use client'

/**
 * GettingStarted - the first-run checklist card at the top of Home.
 *
 * Shown only for NEW workspaces: if nothing has been stored yet, it appears when the workspace is younger than
 * NEW_WORKSPACE_DAYS and fewer than 3 of the data steps are already done (an established or invited-into workspace
 * never sees it). After that the decision is remembered, so the card does not vanish just because the workspace aged.
 *
 * Completion is detected from data Home already loaded (projects / tasks / notes counts, workspace memberCount) plus
 * one light GET /api/invitations for "a pending invite exists". The only step without data is "try search": it is
 * marked when the person opens search from here or presses Ctrl/Cmd+K while the card is mounted.
 *
 * Progress lives in localStorage ("trackwork-onboarding:<userId>:<workspaceId>") inside try/catch - no DB column, so
 * no migration is needed. Without storage the card simply works for the session.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, FileText, FolderKanban, ListChecks, Search, Sparkles, UserPlus, X } from 'lucide-react'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/Kbd'
import CreateProjectDialog from '@/components/create/CreateProjectDialog'
import QuickTaskForm from '@/components/create/QuickTaskForm'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

type StepId = 'project' | 'task' | 'invite' | 'note' | 'search'

interface Stored {
  started: number
  hidden?: boolean
  celebrated?: boolean
  skipped: StepId[]
  marked: StepId[]
}

export interface GettingStartedCounts {
  projects: number
  tasks: number
  notes: number
}

const STEP_IDS: StepId[] = ['project', 'task', 'invite', 'note', 'search']
const NEW_WORKSPACE_DAYS = 14
const DATA_STEPS: StepId[] = ['project', 'task', 'note']

function storageKey(userId: string, workspaceId: string) {
  return `trackwork-onboarding:${userId}:${workspaceId}`
}

function readStored(key: string): Stored | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Stored> | null
    if (!parsed || typeof parsed !== 'object') return null
    return {
      started: typeof parsed.started === 'number' ? parsed.started : Date.now(),
      hidden: Boolean(parsed.hidden),
      celebrated: Boolean(parsed.celebrated),
      skipped: Array.isArray(parsed.skipped) ? parsed.skipped.filter((id): id is StepId => STEP_IDS.includes(id as StepId)) : [],
      marked: Array.isArray(parsed.marked) ? parsed.marked.filter((id): id is StepId => STEP_IDS.includes(id as StepId)) : [],
    }
  } catch {
    return null
  }
}

function writeStored(key: string, value: Stored) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable: progress is kept for this session only
  }
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const radius = 15
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - (total > 0 ? done / total : 0))
  return (
    <svg aria-hidden viewBox="0 0 36 36" className="h-10 w-10 shrink-0 -rotate-90">
      <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="3.5" className="stroke-tertiary" />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
      />
    </svg>
  )
}

export default function GettingStarted({ counts }: { counts: GettingStartedCounts }) {
  const t = useTranslations('onboarding')
  const workspace = useWorkspaceStore((state) => state.currentWorkspace)
  const workspaceId = workspace?.id
  const createdAt = workspace?.created_at
  const memberCount = workspace?.memberCount ?? 1

  const [stored, setStored] = useState<Stored | null>(null)
  const [ready, setReady] = useState(false)
  const [pendingInvites, setPendingInvites] = useState(0)
  const [open, setOpen] = useState(true)
  const [justFinished, setJustFinished] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const keyRef = useRef<string | null>(null)

  const done = useMemo<Record<StepId, boolean>>(() => {
    const marked = stored?.marked ?? []
    return {
      project: counts.projects > 0 || marked.includes('project'),
      task: counts.tasks > 0 || marked.includes('task'),
      invite: memberCount > 1 || pendingInvites > 0 || marked.includes('invite'),
      note: counts.notes > 0 || marked.includes('note'),
      search: marked.includes('search'),
    }
  }, [counts.notes, counts.projects, counts.tasks, memberCount, pendingInvites, stored?.marked])

  // Load (or decide on) the stored state once per workspace.
  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    setReady(false)
    setStored(null)
    ;(async () => {
      let userId = 'anon'
      try {
        const { data } = await supabase.auth.getSession()
        userId = data.session?.user?.id ?? 'anon'
      } catch {
        // fall back to a shared key
      }
      if (cancelled) return
      const nextKey = storageKey(userId, workspaceId)
      keyRef.current = nextKey
      let state = readStored(nextKey)
      if (!state) {
        const age = createdAt ? (Date.now() - new Date(createdAt).getTime()) / 86_400_000 : 0
        const alreadyDone = [counts.projects > 0, counts.tasks > 0, counts.notes > 0].filter(Boolean).length // = DATA_STEPS
        const isNew = age < NEW_WORKSPACE_DAYS && alreadyDone < DATA_STEPS.length
        state = { started: Date.now(), hidden: !isNew, skipped: [], marked: [] }
        writeStored(nextKey, state)
      }
      setStored(state)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
    // Counts are only used for the one-time "is this workspace new?" decision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  // One light request: has anyone been invited from this workspace yet?
  useEffect(() => {
    if (!workspaceId || !ready || stored?.hidden || memberCount > 1) return
    let cancelled = false
    fetch(`/api/invitations?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        const listed = Array.isArray(data.invitations) ? data.invitations.length : 0
        const counted = typeof data.counts?.pending === 'number' ? data.counts.pending : 0
        setPendingInvites(listed + counted)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [workspaceId, ready, stored?.hidden, memberCount])

  // Phone: start collapsed so the card never pushes the tasks off screen.
  useEffect(() => {
    try {
      if (window.matchMedia('(max-width: 639px)').matches) setOpen(false)
    } catch {
      // keep expanded
    }
  }, [])

  const update = useCallback((patch: (state: Stored) => Stored) => {
    setStored((current) => {
      if (!current) return current
      const next = patch(current)
      if (keyRef.current) writeStored(keyRef.current, next)
      return next
    })
  }, [])

  const mark = useCallback(
    (id: StepId) =>
      update((state) => (state.marked.includes(id) ? state : { ...state, marked: [...state.marked, id] })),
    [update]
  )

  // Search step: Ctrl/Cmd+K anywhere on Home counts as having tried it.
  useEffect(() => {
    if (!ready || stored?.hidden || stored?.marked.includes('search')) return
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') mark('search')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, stored?.hidden, stored?.marked, mark])

  const resolved = (id: StepId) => done[id] || Boolean(stored?.skipped.includes(id))
  const doneCount = STEP_IDS.filter((id) => done[id]).length
  const allResolved = ready && STEP_IDS.every(resolved)

  // The "you're all set" moment: remembered immediately so a reload does not replay it.
  useEffect(() => {
    if (!allResolved || !stored || stored.hidden || stored.celebrated) return
    setJustFinished(true)
    update((state) => ({ ...state, celebrated: true }))
  }, [allResolved, stored, update])

  useEffect(() => {
    if (!justFinished) return
    const timer = window.setTimeout(() => setJustFinished(false), 9000)
    return () => window.clearTimeout(timer)
  }, [justFinished])

  if (!workspaceId || !ready || !stored || stored.hidden) return null

  const hide = () => update((state) => ({ ...state, hidden: true }))
  const skip = (id: StepId) =>
    update((state) => (state.skipped.includes(id) ? state : { ...state, skipped: [...state.skipped, id] }))

  const openSearch = () => {
    mark('search')
    window.dispatchEvent(new CustomEvent('trackwork:open-search'))
  }

  if (allResolved) {
    if (!justFinished) return null
    return (
      <section
        role="status"
        className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 animate-fade-in"
      >
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
          <Check className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">{t('allSetTitle')}</p>
          <p className="text-sm text-text-secondary">{t('allSetBody')}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={t('close')}
          onClick={() => setJustFinished(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </section>
    )
  }

  const steps: {
    id: StepId
    icon: typeof FolderKanban
    action: (variant: 'primary' | 'secondary') => ReactNode
  }[] = [
    {
      id: 'project',
      icon: FolderKanban,
      action: (variant) => (
        <Button type="button" size="sm" variant={variant} onClick={() => setProjectOpen(true)}>
          {t('steps.project.action')}
        </Button>
      ),
    },
    {
      id: 'task',
      icon: ListChecks,
      action: (variant) => (
        <Button type="button" size="sm" variant={variant} onClick={() => setTaskOpen(true)}>
          {t('steps.task.action')}
        </Button>
      ),
    },
    {
      id: 'invite',
      icon: UserPlus,
      action: (variant) => (
        <Link href="/dashboard/team" className={buttonClasses({ variant, size: 'sm' })}>
          {t('steps.invite.action')}
        </Link>
      ),
    },
    {
      id: 'note',
      icon: FileText,
      action: (variant) => (
        <Link href="/dashboard/notes" className={buttonClasses({ variant, size: 'sm' })}>
          {t('steps.note.action')}
        </Link>
      ),
    },
    {
      id: 'search',
      icon: Search,
      action: (variant) => (
        <Button type="button" size="sm" variant={variant} onClick={openSearch}>
          {t('steps.search.action')}
        </Button>
      ),
    },
  ]

  const nextStep = steps.find((step) => !resolved(step.id))
  const bodyId = `getting-started-${workspaceId}`

  return (
    <section aria-label={t('title')} className="rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="relative shrink-0">
            <ProgressRing done={doneCount} total={STEP_IDS.length} />
            <Sparkles aria-hidden className="absolute inset-0 m-auto h-4 w-4 text-primary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-text-primary">{t('title')}</span>
            <span className="block truncate text-xs text-text-muted">
              {t('progress', { done: doneCount, total: STEP_IDS.length })}
              {!open && nextStep ? ` · ${t('next', { step: t(`steps.${nextStep.id}.title`) })}` : ''}
            </span>
          </span>
          <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <Button type="button" variant="ghost" size="sm" className="hidden shrink-0 sm:inline-flex" onClick={hide}>
          {t('hide')}
        </Button>
      </div>

      {open ? (
        <div id={bodyId} className="border-t border-border">
          <ol className="divide-y divide-border">
            {steps.map((step, index) => {
              const isDone = done[step.id]
              const isSkipped = !isDone && Boolean(stored.skipped.includes(step.id))
              const Icon = step.icon
              const isNext = nextStep?.id === step.id
              return (
                <li key={step.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <span
                    aria-hidden
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isDone
                        ? 'bg-success text-white'
                        : isSkipped
                          ? 'border border-dashed border-border-strong text-text-muted'
                          : 'bg-tertiary text-text-secondary'
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <div className="min-w-0 flex-1 basis-40">
                    <p
                      className={`flex items-center gap-1.5 text-sm font-medium ${
                        isDone || isSkipped ? 'text-text-muted' : 'text-text-primary'
                      }`}
                    >
                      <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                      <span className={`min-w-0 ${isDone || isSkipped ? 'line-through decoration-border-strong' : ''}`}>
                        {t(`steps.${step.id}.title`)}
                      </span>
                    </p>
                    {!isDone && !isSkipped ? (
                      <p className="mt-0.5 text-xs leading-5 text-text-muted">
                        {step.id === 'search' ? (
                          <>
                            {t('steps.search.body')} <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>
                          </>
                        ) : (
                          t(`steps.${step.id}.body`)
                        )}
                      </p>
                    ) : null}
                    <span className="sr-only">{isDone ? t('doneLabel') : isSkipped ? t('skippedLabel') : ''}</span>
                  </div>
                  {!isDone && !isSkipped ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {step.action(isNext ? 'primary' : 'secondary')}
                      <Button type="button" variant="ghost" size="sm" onClick={() => skip(step.id)}>
                        {t('skip')}
                      </Button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ol>
          <div className="border-t border-border px-4 py-1 sm:hidden">
            <Button type="button" variant="ghost" size="sm" fullWidth onClick={hide}>
              {t('hide')}
            </Button>
          </div>
        </div>
      ) : null}

      <CreateProjectDialog open={projectOpen} onClose={() => setProjectOpen(false)} initialStarter="internal" />
      <QuickTaskForm
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        onCreated={() => mark('task')}
      />
    </section>
  )
}
