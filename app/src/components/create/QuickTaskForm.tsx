'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

interface QuickTaskFormProps {
  open: boolean
  onClose: () => void
}

interface Person {
  id: string
  label: string
}

interface ProjectOption {
  id: string
  name: string
}

const fieldClass =
  'w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50'

function apiError(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
    const message = (data as { error: string }).error
    if (message) return message
  }
  return fallback
}

function readProjects(payload: unknown): ProjectOption[] {
  if (!payload || typeof payload !== 'object' || !('projects' in payload)) return []
  const rows = (payload as { projects: unknown }).projects
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const project = row as { id?: unknown; name?: unknown }
    if (typeof project.id !== 'string' || typeof project.name !== 'string' || !project.name) return []
    return [{ id: project.id, name: project.name }]
  })
}

function readPeople(payload: unknown): Person[] {
  if (!payload || typeof payload !== 'object' || !('members' in payload)) return []
  const rows = (payload as { members: unknown }).members
  if (!Array.isArray(rows)) return []

  const seen = new Set<string>()
  const people: Person[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const member = row as {
      user_id?: unknown
      profiles?:
        | { id?: string; username?: string | null; email?: string | null }
        | { id?: string; username?: string | null; email?: string | null }[]
        | null
    }
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
    const id = typeof member.user_id === 'string' ? member.user_id : profile?.id
    if (!id || seen.has(id)) continue
    seen.add(id)
    const label = profile?.username?.trim() || profile?.email || id
    people.push({ id, label })
  }
  people.sort((a, b) => a.label.localeCompare(b.label))
  return people
}

export default function QuickTaskForm({ open, onClose }: QuickTaskFormProps) {
  const t = useTranslations('create')
  const common = useTranslations('common')
  const router = useRouter()
  const headingId = useId()
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace)
  const [title, setTitle] = useState('')
  const [who, setWho] = useState('me')
  const [when, setWhen] = useState('')
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fallbackError = useRef(common('error'))
  fallbackError.current = common('error')
  const workspaceId = currentWorkspace?.id

  useEffect(() => {
    if (!open) return
    setTitle('')
    setWho('me')
    setWhen('')
    setProjectId('')
    setProjects([])
    setPeople([])
    setUserId('')
    setSaving(false)
    setError(null)

    if (!workspaceId) return

    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        const [teamRes, projectRes, userRes] = await Promise.all([
          fetch(`/api/team?workspace_id=${encodeURIComponent(workspaceId)}`),
          fetch(`/api/projects?workspace_id=${encodeURIComponent(workspaceId)}`),
          supabase.auth.getUser(),
        ])
        const teamData = await teamRes.json().catch(() => null)
        const projectData = await projectRes.json().catch(() => null)
        if (cancelled) return

        setUserId(userRes.data.user?.id ?? '')

        if (!projectRes.ok) {
          setError(apiError(projectData, fallbackError.current))
        } else {
          const list = readProjects(projectData)
          setProjects(list)
          setProjectId(list[0]?.id ?? '')
        }

        if (teamRes.ok) {
          setPeople(readPeople(teamData))
        } else if (projectRes.ok) {
          setError(apiError(teamData, fallbackError.current))
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : fallbackError.current)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, workspaceId])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const workspace = currentWorkspace
    const trimmed = title.trim()
    if (!workspace || !trimmed || !projectId || saving || loading) return

    setSaving(true)
    setError(null)

    try {
      let assigneeId: string | null = null
      if (who === 'me') {
        assigneeId = userId || null
        if (!assigneeId) {
          const { data } = await supabase.auth.getUser()
          assigneeId = data.user?.id ?? null
        }
      } else if (who !== 'unassigned') {
        assigneeId = who
      }

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspace.id,
          project_id: projectId,
          title: trimmed,
          assignee_id: assigneeId,
          due_date: when || null,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(apiError(data, common('error')))

      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : common('error'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const busy = saving || loading

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="flex h-[100dvh] w-full flex-col bg-surface text-text-primary sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl sm:border sm:border-border sm:shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id={headingId} className="text-base font-semibold">
            {t('task')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={common('close')}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!currentWorkspace ? (
          <div className="space-y-4 p-4">
            <p className="text-sm text-text-secondary">{t('needWorkspace')}</p>
            <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
              {t('cancel')}
            </Button>
          </div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div>
              <label htmlFor="quick-task-title" className="mb-1.5 block text-xs font-medium text-text-secondary">
                {t('task')}
              </label>
              <input
                id="quick-task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('taskPlaceholder')}
                className={fieldClass}
                autoFocus
                autoComplete="off"
                disabled={saving}
                required
              />
            </div>

            <div>
              <label htmlFor="quick-task-project" className="mb-1.5 block text-xs font-medium text-text-secondary">
                {t('project')}
              </label>
              <select
                id="quick-task-project"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className={fieldClass}
                disabled={busy || projects.length === 0}
                required
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quick-task-who" className="mb-1.5 block text-xs font-medium text-text-secondary">
                {t('who')}
              </label>
              <select
                id="quick-task-who"
                value={who}
                onChange={(event) => setWho(event.target.value)}
                className={fieldClass}
                disabled={saving}
              >
                <option value="me">{t('me')}</option>
                <option value="unassigned">{t('unassigned')}</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="quick-task-when" className="mb-1.5 block text-xs font-medium text-text-secondary">
                {t('when')}
              </label>
              <input
                id="quick-task-when"
                type="date"
                value={when}
                onChange={(event) => setWhen(event.target.value)}
                className={fieldClass}
                disabled={saving}
              />
            </div>

            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            </div>

            <div className="flex shrink-0 gap-3 border-t border-border bg-surface p-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={busy || !title.trim() || !projectId}
                aria-busy={busy}
              >
                {busy && (
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden
                  />
                )}
                {busy ? common('loading') : t('save')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
