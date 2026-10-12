'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

interface CreateWorkspaceDialogProps {
  open: boolean
  onClose: () => void
}

type WorkspaceKind = 'personal' | 'team' | 'client'

const KINDS: { id: WorkspaceKind; label: 'kindPersonal' | 'kindTeam' | 'kindClient' }[] = [
  { id: 'personal', label: 'kindPersonal' },
  { id: 'team', label: 'kindTeam' },
  { id: 'client', label: 'kindClient' },
]

const fieldClass =
  'w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted sm:text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50'

export default function CreateWorkspaceDialog({ open, onClose }: CreateWorkspaceDialogProps) {
  const t = useTranslations('create')
  const common = useTranslations('common')
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace)
  const storeError = useWorkspaceStore((state) => state.error)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<WorkspaceKind>('personal')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setKind('personal')
    setSaving(false)
    clearError()
  }, [open, clearError])

  const close = () => {
    if (saving) return
    clearError()
    onClose()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || saving) return

    setSaving(true)
    clearError()
    const workspace = await createWorkspace(trimmed, kind)
    setSaving(false)
    if (workspace) onClose()
  }

  return (
    <Dialog
      open={open}
      title={t('workspaceTitle')}
      onClose={close}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={close} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form="create-workspace-form"
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
        </div>
      }
    >
      <form id="create-workspace-form" className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="create-workspace-name" className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('workspaceName')}
          </label>
          <input
            id="create-workspace-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('workspaceNamePlaceholder')}
            className={fieldClass}
            autoFocus
            autoComplete="off"
            disabled={saving}
            required
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">{t('workspaceHelp')}</p>
          <div className="flex flex-wrap gap-2" role="group">
            {KINDS.map((item) => {
              const selected = kind === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setKind(item.id)}
                  disabled={saving}
                  className={`inline-flex min-h-10 items-center rounded-full border px-4 py-1.5 text-sm transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
                    selected
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}
                >
                  {t(item.label)}
                </button>
              )
            })}
          </div>
        </div>

        {storeError ? (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {storeError}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
