'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { enUS, mk } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { useLocaleSwitch } from '@/i18n/LocaleProvider'
import { IconMenu } from '@/components/ui/IconMenu'

const EVENT_LABEL_KEYS: Record<string, string> = {
  'task.created': 'webhooks.eventTaskCreated',
  'task.updated': 'webhooks.eventTaskUpdated',
  'task.completed': 'webhooks.eventTaskCompleted',
  'task.deleted': 'webhooks.eventTaskDeleted',
  'project.created': 'webhooks.eventProjectCreated',
  'project.updated': 'webhooks.eventProjectUpdated',
  'project.deleted': 'webhooks.eventProjectDeleted',
  'comment.created': 'webhooks.eventCommentCreated',
  'time_entry.created': 'webhooks.eventTimeCreated',
}

interface Webhook {
  id: string
  name: string
  url: string
  description: string | null
  events: string[]
  active: boolean
  success_count: number
  failure_count: number
  last_triggered_at: string | null
  created_at: string
}

interface WebhookLog {
  id: string
  event_type: string
  status_code: number | null
  response_body: string | null
  error_message: string | null
  duration_ms: number | null
  attempt_number: number | null
  success: boolean
  created_at: string
}

interface WebhookListProps {
  webhooks: Webhook[]
  onEdit: (webhook: Webhook) => void
  onDelete: (webhookId: string) => void
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function snippet(value: string | null) {
  if (!value) return null
  return value.length > 180 ? `${value.slice(0, 180)}…` : value
}

export default function WebhookList({ webhooks, onEdit, onDelete }: WebhookListProps) {
  const t = useTranslations('pages.tools')
  const { locale } = useLocaleSwitch()
  const dateLocale = locale === 'mk' ? mk : enUS
  const [activeOverride, setActiveOverride] = useState<Record<string, boolean>>({})
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null)
  const [logsOpen, setLogsOpen] = useState<string | null>(null)
  const [logs, setLogs] = useState<Record<string, WebhookLog[] | 'loading' | 'error'>>({})

  const eventLabel = (event: string) => (EVENT_LABEL_KEYS[event] ? t(EVENT_LABEL_KEYS[event]) : event)

  const toggleActive = async (webhook: Webhook) => {
    const next = !webhook.active
    setActiveOverride((prev) => ({ ...prev, [webhook.id]: next }))
    try {
      const response = await fetch('/api/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_id: webhook.id,
          active: next,
        }),
      })
      if (!response.ok) throw new Error('toggle failed')
    } catch (error) {
      console.error('Error toggling webhook:', error)
      setActiveOverride((prev) => ({ ...prev, [webhook.id]: webhook.active }))
    }
  }

  const loadLogs = async (webhookId: string) => {
    setLogs((prev) => ({ ...prev, [webhookId]: 'loading' }))
    try {
      const response = await fetch(`/api/webhooks/logs?webhook_id=${webhookId}&limit=20`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'logs failed')
      setLogs((prev) => ({ ...prev, [webhookId]: data.logs || [] }))
    } catch (error) {
      console.error('Error loading webhook logs:', error)
      setLogs((prev) => ({ ...prev, [webhookId]: 'error' }))
    }
  }

  const toggleLogs = (webhookId: string) => {
    const next = logsOpen === webhookId ? null : webhookId
    setLogsOpen(next)
    if (!next) return
    const cached = logs[webhookId]
    if (Array.isArray(cached)) return
    void loadLogs(webhookId)
  }

  const activeOf = (webhook: Webhook) => activeOverride[webhook.id] ?? webhook.active

  const getSuccessRate = (webhook: Webhook) => {
    const total = webhook.success_count + webhook.failure_count
    if (total === 0) return 0
    return Math.round((webhook.success_count / total) * 100)
  }

  const when = (value: string) => formatDistanceToNow(new Date(value), { addSuffix: true, locale: dateLocale })

  return (
    <ul className="space-y-3">
      {webhooks.map((webhook) => {
        const active = activeOf(webhook)
        const logState = logs[webhook.id]
        return (
          <li key={webhook.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-base font-semibold text-text-primary">{webhook.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      active ? 'bg-primary/10 text-primary' : 'bg-surface-hover text-text-secondary'
                    }`}
                  >
                    {active ? t('webhooks.active') : t('webhooks.inactive')}
                  </span>
                </div>
                {webhook.description ? (
                  <p className="mt-1 break-words text-sm text-text-secondary">{webhook.description}</p>
                ) : null}
                <p className="mt-1 break-all text-xs text-text-secondary">{hostOf(webhook.url)}</p>
                <p className="mt-1 text-xs text-text-secondary">
                  {t('webhooks.eventsCount', { count: webhook.events?.length || 0 })}
                  {webhook.last_triggered_at
                    ? ` · ${t('webhooks.lastTriggered', { when: when(webhook.last_triggered_at) })}`
                    : ''}
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  {t('webhooks.success')} {webhook.success_count} · {t('webhooks.failed')} {webhook.failure_count} ·{' '}
                  {t('webhooks.rate')} {getSuccessRate(webhook)}%
                </p>
              </div>
              <IconMenu
                label={webhook.name}
                items={[
                  {
                    label: t('webhooks.viewDetails'),
                    onClick: () => setExpandedWebhook((current) => (current === webhook.id ? null : webhook.id)),
                  },
                  {
                    label: t('webhooks.viewLogs'),
                    onClick: () => toggleLogs(webhook.id),
                  },
                  {
                    label: active ? t('webhooks.disable') : t('webhooks.enable'),
                    onClick: () => void toggleActive({ ...webhook, active }),
                  },
                  { label: t('webhooks.editAction'), onClick: () => onEdit(webhook) },
                  { label: t('webhooks.delete'), onClick: () => onDelete(webhook.id), danger: true },
                ]}
              />
            </div>

            {expandedWebhook === webhook.id ? (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                <div>
                  <h4 className="text-sm font-medium text-text-primary">{t('webhooks.url')}</h4>
                  <p className="mt-1 break-all text-xs text-text-secondary">{webhook.url}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-text-primary">{t('webhooks.subscribedEvents')}</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(webhook.events || []).map((event) => (
                      <span key={event} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                        {eventLabel(event)}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-text-secondary">{t('webhooks.created', { when: when(webhook.created_at) })}</p>
              </div>
            ) : null}

            {logsOpen === webhook.id ? (
              <div className="mt-3 border-t border-border pt-3">
                <h4 className="text-sm font-medium text-text-primary">{t('webhooks.viewLogs')}</h4>
                {logState === 'loading' || !logState ? (
                  <p className="mt-2 text-sm text-text-secondary">{t('webhooks.logsLoading')}</p>
                ) : logState === 'error' ? (
                  <p className="mt-2 text-sm text-text-secondary">{t('webhooks.logsFailed')}</p>
                ) : logState.length === 0 ? (
                  <p className="mt-2 text-sm text-text-secondary">{t('webhooks.logsEmpty')}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {logState.map((log) => {
                      const detail = snippet(log.error_message) || snippet(log.response_body)
                      return (
                        <li key={log.id} className="rounded-xl border border-border px-3 py-2">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <p className="min-w-0 break-words text-sm font-medium text-text-primary">
                              {eventLabel(log.event_type)}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {log.success ? t('webhooks.success') : t('webhooks.failed')}
                              {log.status_code ? ` · ${log.status_code}` : ''}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-text-secondary">
                            {when(log.created_at)}
                            {log.duration_ms != null ? ` · ${log.duration_ms} ms` : ''}
                            {log.attempt_number && log.attempt_number > 1 ? ` · ${log.attempt_number}` : ''}
                          </p>
                          {detail ? <p className="mt-1 break-words text-xs text-text-secondary">{detail}</p> : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
