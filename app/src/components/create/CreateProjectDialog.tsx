'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { starterTasks, type StarterId } from '@/lib/project-starters'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
}

const STARTERS: StarterId[] = ['blank', 'client', 'product', 'internal', 'personal']

const STARTER_LABEL: Record<StarterId, 'starterBlank' | 'starterClient' | 'starterProduct' | 'starterInternal' | 'starterPersonal'> = {
  blank: 'starterBlank',
  client: 'starterClient',
  product: 'starterProduct',
  internal: 'starterInternal',
  personal: 'starterPersonal',
}

const STARTER_HELP: Record<StarterId, 'starterBlankHelp' | 'starterClientHelp' | 'starterProductHelp' | 'starterInternalHelp' | 'starterPersonalHelp'> = {
  blank: 'starterBlankHelp',
  client: 'starterClientHelp',
  product: 'starterProductHelp',
  internal: 'starterInternalHelp',
  personal: 'starterPersonalHelp',
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

export default function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const t = useTranslations('create')
  const common = useTranslations('common')
  const router = useRouter()
  const headingId = useId()
  const helpId = useId()
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace)
  const [name, setName] = useState('')
  const [starter, setStarter] = useState<StarterId>('blank')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const taskCursor = useRef(0)
  const starterAtCreate = useRef<StarterId>('blank')

  useEffect(() => {
    if (!open) return
    setName('')
    setStarter('blank')
    setSaving(false)
    setError(null)
    setCreatedProjectId(null)
    taskCursor.current = 0
    starterAtCreate.current = 'blank'
  }, [open])

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
    const trimmed = name.trim()
    if (!workspace || !trimmed || saving) return

    setSaving(true)
    setError(null)

    try {
      let projectId = createdProjectId
      if (!projectId) {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspace.id,
            name: trimmed,
            status: 'active',
            color: '#667eea',
          }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(apiError(data, common('error')))
        projectId = data?.project?.id
        if (!projectId) throw new Error(apiError(data, common('error')))
        setCreatedProjectId(projectId)
        starterAtCreate.current = starter
        taskCursor.current = 0
      }

      const tasks = starterTasks(starterAtCreate.current)
      for (let i = taskCursor.current; i < tasks.length; i++) {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspace.id,
            project_id: projectId,
            title: tasks[i].title,
          }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(apiError(data, common('error')))
        taskCursor.current = i + 1
      }

      onClose()
      router.push(`/dashboard/projects/${projectId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : common('error'))
    } finally {
      setSaving(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  const locked = saving || Boolean(createdProjectId)

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="flex h-[100dvh] w-full flex-col bg-surface text-text-primary sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl sm:border sm:border-border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-4 py-3">
          <h2 id={headingId} className="text-base font-semibold">
            {t('projectTitle')}
          </h2>
        </div>

        {!currentWorkspace ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <p className="text-sm text-text-secondary">{t('needWorkspace')}</p>
            </div>
            <div className="border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
                {t('cancel')}
              </Button>
            </div>
          </>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <p className="text-sm text-text-secondary">{t('projectHelp')}</p>
              <div>
                <label htmlFor="create-project-name" className="mb-1.5 block text-xs font-medium text-text-secondary">
                  {t('projectName')}
                </label>
                <input
                  id="create-project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('projectNamePlaceholder')}
                  className={fieldClass}
                  autoFocus
                  autoComplete="off"
                  disabled={locked}
                  required
                />
              </div>

              <div>
                <div className="flex flex-wrap gap-2" role="group" aria-describedby={helpId}>
                  {STARTERS.map((id) => {
                    const selected = starter === id
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setStarter(id)}
                        disabled={locked}
                        className={`rounded-full border px-3 py-1 text-sm disabled:opacity-50 ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-secondary hover:bg-surface-hover'
                        }`}
                      >
                        {t(STARTER_LABEL[id])}
                      </button>
                    )
                  })}
                </div>
                <p id={helpId} className="mt-2 text-sm text-text-secondary">
                  {t(STARTER_HELP[starter])}
                </p>
              </div>

              {error && (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={saving || !name.trim()}
                aria-busy={saving}
              >
                {saving && (
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden
                  />
                )}
                {saving ? common('loading') : t('create')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
