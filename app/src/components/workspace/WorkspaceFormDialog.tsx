'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'

interface WorkspaceFormDialogProps {
  isOpen: boolean
  onClose: () => void
  workspace?: {
    id: string
    name: string
    category?: string
    color?: string
    description?: string
  } | null
}

const WORKSPACE_CATEGORIES = [
  { value: 'personal', icon: '👤' },
  { value: 'work', icon: '💼' },
  { value: 'client', icon: '🤝' },
  { value: 'team', icon: '👥' },
  { value: 'freelance', icon: '🚀' },
  { value: 'education', icon: '🎓' },
  { value: 'other', icon: '📦' },
] as const

const COLOR_PRESETS = [
  { key: 'indigo', value: '#667eea' },
  { key: 'blue', value: '#3b82f6' },
  { key: 'green', value: '#10b981' },
  { key: 'orange', value: '#f59e0b' },
  { key: 'red', value: '#ef4444' },
  { key: 'purple', value: '#8b5cf6' },
  { key: 'pink', value: '#ec4899' },
  { key: 'cyan', value: '#06b6d4' },
] as const

const fieldClass =
  'w-full max-w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export default function WorkspaceFormDialog({ isOpen, onClose, workspace }: WorkspaceFormDialogProps) {
  const t = useTranslations('pages.people')
  const { createWorkspace, updateWorkspace } = useWorkspaceStore()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('#667eea')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (workspace) {
      setName(workspace.name)
      setCategory(workspace.category || '')
      setColor(workspace.color || '#667eea')
      setDescription(workspace.description || '')
    } else {
      setName('')
      setCategory('')
      setColor('#667eea')
      setDescription('')
    }
    setError(null)
  }, [workspace, isOpen])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(t('form.nameRequired'))
      return
    }

    setLoading(true)

    try {
      if (workspace) {
        const ok = await updateWorkspace(workspace.id, {
          name: name.trim(),
          category: category || undefined,
          color,
          description: description.trim() || undefined,
        })
        if (!ok) {
          setError(useWorkspaceStore.getState().error || t('form.saveFailed'))
          return
        }
      } else {
        const created = await createWorkspace(
          name.trim(),
          category || undefined,
          color,
          description.trim() || undefined
        )
        if (!created) {
          setError(useWorkspaceStore.getState().error || t('form.saveFailed'))
          return
        }
      }

      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('form.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  const requestClose = () => {
    if (!loading) onClose()
  }

  return (
    <Dialog
      open={isOpen}
      title={workspace ? t('form.editTitle') : t('form.createTitle')}
      onClose={requestClose}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={requestClose} disabled={loading}>
            {t('form.cancel')}
          </Button>
          <Button type="submit" form="workspace-form" className="flex-1" disabled={loading || !name.trim()}>
            {loading ? t('form.saving') : workspace ? t('form.update') : t('form.create')}
          </Button>
        </div>
      }
    >
      <form id="workspace-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-secondary">{workspace ? t('form.editSubtitle') : t('form.createSubtitle')}</p>
        {error ? (
          <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary">{error}</p>
        ) : null}

        <label className="block text-sm text-text-secondary">
          {t('form.name')}
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('form.namePlaceholder')}
            disabled={loading}
            required
            className={`${fieldClass} mt-1.5 disabled:opacity-50`}
          />
        </label>

        <div>
          <p className="text-sm text-text-secondary">{t('form.category')}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {WORKSPACE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                disabled={loading}
                className={`min-w-0 break-words rounded-xl border px-3 py-2 text-left text-sm font-medium disabled:opacity-50 ${
                  category === cat.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary text-text-secondary'
                }`}
              >
                <span className="mr-1">{cat.icon}</span>
                {t(`form.categories.${cat.value}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-text-secondary">{t('form.color')}</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setColor(preset.value)}
                disabled={loading}
                aria-label={t(`form.colors.${preset.key}`)}
                className={`h-10 rounded-lg disabled:opacity-50 ${
                  color === preset.value ? 'outline outline-2 outline-offset-2 outline-primary' : ''
                }`}
                style={{ backgroundColor: preset.value }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              disabled={loading}
              aria-label={t('form.color')}
              className="h-10 w-full cursor-pointer rounded-lg border border-border bg-secondary disabled:opacity-50 sm:w-12"
            />
            <input
              type="text"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="#667eea"
              disabled={loading}
              className={`${fieldClass} min-w-0 font-mono disabled:opacity-50 sm:flex-1`}
            />
          </div>
        </div>

        <label className="block text-sm text-text-secondary">
          {t('form.description')}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('form.descriptionPlaceholder')}
            rows={3}
            disabled={loading}
            className={`${fieldClass} mt-1.5 resize-none disabled:opacity-50`}
          />
        </label>
      </form>
    </Dialog>
  )
}
