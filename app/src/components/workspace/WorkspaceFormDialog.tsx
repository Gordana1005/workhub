'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'

interface WorkspaceFormDialogProps {
  isOpen: boolean
  onClose: () => void
  workspace: {
    id: string
    name: string
    category?: string
    color?: string
    description?: string
  } | null
}

const WORKSPACE_CATEGORIES = ['personal', 'work', 'client', 'team', 'freelance', 'education', 'other'] as const

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
  'w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'

/** Edit a workspace's name, category, colour and description. (Creating one uses the short CreateWorkspaceDialog.) */
export default function WorkspaceFormDialog({ isOpen, onClose, workspace }: WorkspaceFormDialogProps) {
  const t = useTranslations('pages.people')
  const updateWorkspace = useWorkspaceStore((state) => state.updateWorkspace)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [color, setColor] = useState('#667eea')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !workspace) return
    setName(workspace.name)
    setCategory(workspace.category || '')
    setColor(workspace.color || '#667eea')
    setDescription(workspace.description || '')
    setError(null)
    setLoading(false)
  }, [workspace, isOpen])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!workspace || loading) return
    setError(null)

    if (!name.trim()) {
      setError(t('form.nameRequired'))
      return
    }

    setLoading(true)
    try {
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

  const swatches: string[] = COLOR_PRESETS.map((preset) => preset.value)
  if (!swatches.includes(color)) swatches.unshift(color)

  return (
    <Dialog
      open={isOpen && Boolean(workspace)}
      title={t('form.editTitle')}
      onClose={requestClose}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={requestClose} disabled={loading}>
            {t('form.cancel')}
          </Button>
          <Button type="submit" form="workspace-form" className="w-full sm:w-auto" disabled={loading || !name.trim()}>
            {loading ? t('form.saving') : t('form.save')}
          </Button>
        </div>
      }
    >
      <form id="workspace-form" onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <label className="block text-sm font-medium text-text-secondary">
          {t('form.name')}
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('form.namePlaceholder')}
            disabled={loading}
            required
            autoFocus
            className={`${fieldClass} mt-1.5`}
          />
        </label>

        <div>
          <p className="text-sm font-medium text-text-secondary">{t('form.category')}</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('form.category')}>
            {WORKSPACE_CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                onClick={() => setCategory(category === value ? '' : value)}
                disabled={loading}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
                  category === value
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                {t(`form.categories.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-text-secondary">{t('form.color')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {swatches.map((value) => {
              const preset = COLOR_PRESETS.find((item) => item.value === value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setColor(value)}
                  disabled={loading}
                  aria-label={preset ? t(`form.colors.${preset.key}`) : value}
                  aria-pressed={color === value}
                  className={`h-8 w-8 rounded-lg transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 ${
                    color === value ? 'ring-2 ring-text-primary ring-offset-2 ring-offset-surface' : ''
                  }`}
                  style={{ backgroundColor: value }}
                />
              )
            })}
          </div>
        </div>

        <label className="block text-sm font-medium text-text-secondary">
          {t('form.description')}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('form.descriptionPlaceholder')}
            rows={3}
            disabled={loading}
            className={`${fieldClass} mt-1.5 resize-none`}
          />
        </label>
      </form>
    </Dialog>
  )
}
