'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
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
  'w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50'

export default function CreateWorkspaceDialog({ open, onClose }: CreateWorkspaceDialogProps) {
  const t = useTranslations('create')
  const common = useTranslations('common')
  const headingId = useId()
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

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearError()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, clearError])

  const close = () => {
    clearError()
    onClose()
  }

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
    const trimmed = name.trim()
    if (!trimmed || saving) return

    setSaving(true)
    clearError()
    const workspace = await createWorkspace(trimmed, kind)
    setSaving(false)
    if (workspace) onClose()
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      onClick={close}
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
            {t('workspaceTitle')}
          </h2>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <p className="text-sm text-text-secondary">{t('workspaceHelp')}</p>
            <div>
              <label htmlFor="create-workspace-name" className="mb-1.5 block text-xs font-medium text-text-secondary">
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
                    className={`rounded-full border px-3 py-1 text-sm disabled:opacity-50 ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    {t(item.label)}
                  </button>
                )
              })}
            </div>

            {storeError && (
              <p className="text-sm text-danger" role="alert">
                {storeError}
              </p>
            )}
          </div>

          <div className="flex gap-3 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button type="button" variant="secondary" className="flex-1" onClick={close} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving || !name.trim()} aria-busy={saving}>
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
      </div>
    </div>,
    document.body
  )
}
