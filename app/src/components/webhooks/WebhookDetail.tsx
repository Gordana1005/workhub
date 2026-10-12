'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { enUS, mk } from 'date-fns/locale'
import { Check, CheckCircle2, Copy, RefreshCw, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLocaleSwitch } from '@/i18n/LocaleProvider'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EVENT_LABEL_KEYS, successRate, type Webhook } from './shared'

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

function snippet(value: string | null) {
  if (!value) return null
  return value.length > 200 ? `${value.slice(0, 200)}...` : value
}

export default function WebhookDetail({
  webhook,
  active,
  onEdit,
}: {
  webhook: Webhook
  active: boolean
  onEdit: (webhook: Webhook) => void
}) {
  const t = useTranslations('pages.tools')
  const { locale } = useLocaleSwitch()
  const dateLocale = locale === 'mk' ? mk : enUS
  const [logs, setLogs] = useState<WebhookLog[] | 'loading' | 'error'>('loading')
  const [copied, setCopied] = useState(false)

  const loadLogs = useCallback(async () => {
    setLogs('loading')
    try {
      const response = await fetch(`/api/webhooks/logs?webhook_id=${webhook.id}&limit=30`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'logs failed')
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Error loading webhook logs:', error)
      setLogs('error')
    }
  }, [webhook.id])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const when = (value: string) => formatDistanceToNow(new Date(value), { addSuffix: true, locale: dateLocale })
  const eventLabel = (event: string) => (EVENT_LABEL_KEYS[event] ? t(EVENT_LABEL_KEYS[event]) : event)
  const rate = successRate(webhook)

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhook.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable: the URL stays selectable */
    }
  }

  const stats = [
    { label: t('webhooks.success'), value: String(webhook.success_count), danger: false },
    { label: t('webhooks.failed'), value: String(webhook.failure_count), danger: webhook.failure_count > 0 },
    { label: t('webhooks.rate'), value: rate === null ? '-' : `${rate}%`, danger: false },
  ]

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold text-text-primary">{webhook.name}</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            {active ? t('webhooks.active') : t('webhooks.inactive')} · {t('webhooks.created', { when: when(webhook.created_at) })}
          </p>
          {webhook.description ? (
            <p className="mt-2 break-words text-sm text-text-secondary">{webhook.description}</p>
          ) : null}
        </div>
        <Button type="button" variant="secondary" size="sm" className="h-11 sm:h-8" onClick={() => onEdit(webhook)}>
          {t('webhooks.editAction')}
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-hover px-3 py-2">
        <code className="min-w-0 flex-1 break-all text-xs text-text-primary">{webhook.url}</code>
        <button
          type="button"
          onClick={copyUrl}
          aria-label={t('webhooks.copyUrl')}
          title={t('webhooks.copyUrl')}
          className="-my-1 -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-9 sm:w-9"
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {stats.map((item) => (
          <div key={item.label} className="min-w-0 bg-surface px-3 py-2">
            <dt className="truncate text-xs text-text-secondary">{item.label}</dt>
            <dd className={`text-lg font-semibold tabular-nums ${item.danger ? 'text-danger' : 'text-text-primary'}`}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div>
        <h3 className="text-sm font-medium text-text-primary">{t('webhooks.subscribedEvents')}</h3>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {(webhook.events || []).map((event) => (
            <li key={event} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {eventLabel(event)}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-text-primary">{t('webhooks.deliveries')}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => void loadLogs()} className="h-11 gap-1.5 sm:h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${logs === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
            {t('webhooks.refresh')}
          </Button>
        </div>

        {logs === 'loading' ? (
          <div className="space-y-2" role="status" aria-label={t('webhooks.logsLoading')}>
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : logs === 'error' ? (
          <p className="py-6 text-center text-sm text-danger">{t('webhooks.logsFailed')}</p>
        ) : logs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-text-secondary">
            {t('webhooks.logsEmpty')}
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {logs.map((log) => {
              const detail = snippet(log.error_message) || (log.success ? null : snippet(log.response_body))
              return (
                <li key={log.id} className="flex items-start gap-3 px-3 py-3">
                  {log.success ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label={t('webhooks.success')} />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label={t('webhooks.failed')} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="min-w-0 break-words text-sm font-medium text-text-primary">{eventLabel(log.event_type)}</p>
                      <p className="shrink-0 text-xs tabular-nums text-text-secondary">
                        {log.status_code ? `${log.status_code}` : ''}
                        {log.duration_ms != null ? `${log.status_code ? ' · ' : ''}${log.duration_ms} ms` : ''}
                      </p>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {when(log.created_at)}
                      {log.attempt_number && log.attempt_number > 1 ? ` · ${t('webhooks.attempt', { count: log.attempt_number })}` : ''}
                    </p>
                    {detail ? <p className="mt-1 break-words text-xs text-text-muted">{detail}</p> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
