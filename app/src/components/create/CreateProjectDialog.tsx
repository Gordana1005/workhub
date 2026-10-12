'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { colorForName, starterTaskKeys, type StarterId } from '@/lib/project-starters'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
  /** Starter chip selected when the dialog opens (default: blank). */
  initialStarter?: StarterId
}

const STARTERS: StarterId[] = ['blank', 'client', 'product', 'internal', 'personal', 'event']

const STARTER_LABEL: Record<StarterId, 'starterBlank' | 'starterClient' | 'starterProduct' | 'starterInternal' | 'starterPersonal' | 'starterEvent'> = {
  blank: 'starterBlank',
  client: 'starterClient',
  product: 'starterProduct',
  internal: 'starterInternal',
  personal: 'starterPersonal',
  event: 'starterEvent',
}

const STARTER_HELP: Record<StarterId, 'starterBlankHelp' | 'starterClientHelp' | 'starterProductHelp' | 'starterInternalHelp' | 'starterPersonalHelp' | 'starterEventHelp'> = {
  blank: 'starterBlankHelp',
  client: 'starterClientHelp',
  product: 'starterProductHelp',
  internal: 'starterInternalHelp',
  personal: 'starterPersonalHelp',
  event: 'starterEventHelp',
}

const fieldClass =
  'w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted sm:text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50'

function apiError(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
    const message = (data as { error: string }).error
    if (message) return message
  }
  return fallback
}

export default function CreateProjectDialog({ open, onClose, initialStarter = 'blank' }: CreateProjectDialogProps) {
  const t = useTranslations('create')
  const tp = useTranslations('pages.projects')
  const common = useTranslations('common')
  const router = useRouter()
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
    setStarter(initialStarter)
    setSaving(false)
    setError(null)
    setCreatedProjectId(null)
    taskCursor.current = 0
    starterAtCreate.current = initialStarter
  // initialStarter is read only at open time
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            color: colorForName(trimmed),
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

      // Created last-to-first: the task list shows newest first, so the starter reads in its natural order.
      const keys = starterTaskKeys(starterAtCreate.current).reverse()
      for (let i = taskCursor.current; i < keys.length; i++) {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: workspace.id,
            project_id: projectId,
            title: tp(`starters.${keys[i]}`),
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

  const locked = saving || Boolean(createdProjectId)
  const close = () => {
    if (!saving) onClose()
  }

  return (
    <Dialog
      open={open}
      title={t('projectTitle')}
      onClose={close}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={close} disabled={saving}>
            {t('cancel')}
          </Button>
          {currentWorkspace ? (
            <Button
              type="submit"
              form="create-project-form"
              className="w-full gap-2 sm:w-auto"
              disabled={saving || !name.trim()}
              aria-busy={saving}
            >
              {saving ? (
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden
                />
              ) : null}
              {saving ? common('loading') : t('create')}
            </Button>
          ) : null}
        </div>
      }
    >
      {!currentWorkspace ? (
        <p className="text-sm text-text-secondary">{t('needWorkspace')}</p>
      ) : (
        <form id="create-project-form" className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="create-project-name" className="mb-1.5 block text-sm font-medium text-text-secondary">
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
            <p className="mb-2 text-sm font-medium text-text-secondary">{t('projectHelp')}</p>
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
                    className={`inline-flex min-h-10 items-center rounded-full border px-4 py-1.5 text-sm transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
                      selected
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : 'border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    {t(STARTER_LABEL[id])}
                  </button>
                )
              })}
            </div>
            <p id={helpId} className="mt-2 text-sm text-text-muted">
              {t(STARTER_HELP[starter])}
            </p>
          </div>

          {error ? (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </Dialog>
  )
}
