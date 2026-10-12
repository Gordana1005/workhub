'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'

interface WebhookFormProps {
  webhook?: {
    id: string
    name?: string
    url?: string
    description?: string | null
    events?: string[]
    verify_ssl?: boolean
  } | null
  workspaceId: string
  onClose: () => void
}

const AVAILABLE_EVENTS = [
  { value: 'task.created', labelKey: 'webhooks.eventTaskCreated', descriptionKey: 'webhooks.eventTaskCreatedHelp' },
  { value: 'task.updated', labelKey: 'webhooks.eventTaskUpdated', descriptionKey: 'webhooks.eventTaskUpdatedHelp' },
  { value: 'task.completed', labelKey: 'webhooks.eventTaskCompleted', descriptionKey: 'webhooks.eventTaskCompletedHelp' },
  { value: 'task.deleted', labelKey: 'webhooks.eventTaskDeleted', descriptionKey: 'webhooks.eventTaskDeletedHelp' },
  { value: 'project.created', labelKey: 'webhooks.eventProjectCreated', descriptionKey: 'webhooks.eventProjectCreatedHelp' },
  { value: 'project.updated', labelKey: 'webhooks.eventProjectUpdated', descriptionKey: 'webhooks.eventProjectUpdatedHelp' },
  { value: 'project.deleted', labelKey: 'webhooks.eventProjectDeleted', descriptionKey: 'webhooks.eventProjectDeletedHelp' },
  { value: 'comment.created', labelKey: 'webhooks.eventCommentCreated', descriptionKey: 'webhooks.eventCommentCreatedHelp' },
  { value: 'time_entry.created', labelKey: 'webhooks.eventTimeCreated', descriptionKey: 'webhooks.eventTimeCreatedHelp' },
] as const

const fieldClass =
  'w-full max-w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'

export default function WebhookForm({ webhook, workspaceId, onClose }: WebhookFormProps) {
  const t = useTranslations('pages.tools')
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    events: [] as string[],
    verify_ssl: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (webhook) {
      setFormData({
        name: webhook.name || '',
        url: webhook.url || '',
        description: webhook.description || '',
        events: webhook.events || [],
        verify_ssl: webhook.verify_ssl !== false,
      })
    }
  }, [webhook])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError(t('webhooks.nameRequired'))
      return
    }

    if (!formData.url.trim()) {
      setError(t('webhooks.urlRequired'))
      return
    }

    try {
      new URL(formData.url)
    } catch {
      setError(t('webhooks.invalidUrl'))
      return
    }

    if (formData.events.length === 0) {
      setError(t('webhooks.selectEvent'))
      return
    }

    setLoading(true)

    try {
      const method = webhook ? 'PATCH' : 'POST'
      const body = webhook ? { webhook_id: webhook.id, ...formData } : { workspace_id: workspaceId, ...formData }

      const response = await fetch('/api/webhooks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('webhooks.saveFailed'))
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('webhooks.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  const toggleEvent = (eventValue: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter((item) => item !== eventValue)
        : [...prev.events, eventValue],
    }))
  }

  const requestClose = () => {
    if (!loading) onClose()
  }

  return (
    <Dialog
      open
      title={webhook ? t('webhooks.edit') : t('webhooks.createTitle')}
      onClose={requestClose}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={requestClose} disabled={loading}>
            {t('webhooks.cancel')}
          </Button>
          <Button type="submit" form="webhook-form" className="flex-1" disabled={loading}>
            {loading ? t('webhooks.saving') : webhook ? t('webhooks.saveChanges') : t('webhooks.create')}
          </Button>
        </div>
      }
    >
      <form id="webhook-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <label className="block text-sm text-text-secondary">
          {t('webhooks.name')}
          <input
            type="text"
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            placeholder={t('webhooks.namePlaceholder')}
            className={`${fieldClass} mt-1.5`}
          />
        </label>

        <label className="block text-sm text-text-secondary">
          {t('webhooks.url')}
          <input
            type="url"
            value={formData.url}
            onChange={(event) => setFormData({ ...formData, url: event.target.value })}
            placeholder="https://example.com/webhook"
            className={`${fieldClass} mt-1.5`}
          />
          <span className="mt-1 block text-xs text-text-secondary">{t('webhooks.urlHint')}</span>
        </label>

        <label className="block text-sm text-text-secondary">
          {t('webhooks.description')}
          <textarea
            value={formData.description}
            onChange={(event) => setFormData({ ...formData, description: event.target.value })}
            placeholder={t('webhooks.descriptionPlaceholder')}
            rows={2}
            className={`${fieldClass} mt-1.5 resize-none`}
          />
        </label>

        <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <legend className="mb-2 text-sm text-text-secondary sm:col-span-2">{t('webhooks.events')}</legend>
          {AVAILABLE_EVENTS.map((event) => (
            <label
              key={event.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition-colors ${
                formData.events.includes(event.value) ? 'border-primary bg-primary/10' : 'border-border hover:bg-surface-hover'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.events.includes(event.value)}
                onChange={() => toggleEvent(event.value)}
                className="mt-1 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-text-primary">{t(event.labelKey)}</span>
                <span className="block text-xs text-text-secondary">{t(event.descriptionKey)}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="flex items-start gap-3 rounded-xl border border-border bg-surface px-3 py-2">
          <input
            type="checkbox"
            checked={formData.verify_ssl}
            onChange={(event) => setFormData({ ...formData, verify_ssl: event.target.checked })}
            className="mt-1 h-4 w-4 rounded border-border accent-primary"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-text-primary">{t('webhooks.verifySsl')}</span>
            <span className="block text-xs text-text-secondary">{t('webhooks.verifySslHint')}</span>
          </span>
        </label>

        <p className="break-words text-sm text-text-secondary">
          <strong className="font-medium text-text-primary">{t('webhooks.securityLabel')}</strong> {t('webhooks.securityBefore')}{' '}
          <code className="break-all rounded bg-tertiary px-1 py-0.5 text-xs text-text-primary">X-Webhook-Signature</code>{' '}
          {t('webhooks.securityAfter')}
        </p>
      </form>
    </Dialog>
  )
}
