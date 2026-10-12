'use client'

import { formatDistanceToNow } from 'date-fns'
import { enUS, mk } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { useLocaleSwitch } from '@/i18n/LocaleProvider'
import { Badge } from '@/components/ui/Badge'
import { IconMenu } from '@/components/ui/IconMenu'
import { hostOf, healthOf, successRate, type Webhook, type WebhookHealth } from './shared'

interface WebhookListProps {
  webhooks: Webhook[]
  selectedId: string | null
  activeOf: (webhook: Webhook) => boolean
  onSelect: (webhook: Webhook) => void
  onToggle: (webhook: Webhook) => void
  onEdit: (webhook: Webhook) => void
  onDelete: (webhookId: string) => void
}

export default function WebhookList({
  webhooks,
  selectedId,
  activeOf,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
}: WebhookListProps) {
  const t = useTranslations('pages.tools')
  const { locale } = useLocaleSwitch()
  const dateLocale = locale === 'mk' ? mk : enUS

  const healthBadge = (health: WebhookHealth) => {
    switch (health) {
      case 'healthy':
        return <Badge size="sm" variant="success">{t('webhooks.active')}</Badge>
      case 'failing':
        return <Badge size="sm" variant="danger">{t('webhooks.failing')}</Badge>
      case 'paused':
        return <Badge size="sm" variant="neutral">{t('webhooks.inactive')}</Badge>
      default:
        return <Badge size="sm" variant="blue">{t('webhooks.active')}</Badge>
    }
  }

  return (
    <ul className="space-y-2">
      {webhooks.map((webhook) => {
        const active = activeOf(webhook)
        const health = healthOf(webhook, active)
        const rate = successRate(webhook)
        const selected = selectedId === webhook.id
        return (
          <li
            key={webhook.id}
            className={`flex items-start gap-1 rounded-2xl border bg-surface transition-colors ${
              selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-surface-hover'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(webhook)}
              aria-pressed={selected}
              className="min-h-[4.5rem] min-w-0 flex-1 rounded-2xl px-4 py-3 text-left active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 break-words text-sm font-semibold text-text-primary hyphens-auto">{webhook.name}</span>
                {healthBadge(health)}
              </span>
              <span className="mt-0.5 block truncate text-xs text-text-secondary">{hostOf(webhook.url)}</span>
              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                <span>{t('webhooks.eventsCount', { count: webhook.events?.length || 0 })}</span>
                <span>
                  {webhook.last_triggered_at
                    ? t('webhooks.lastTriggered', {
                        when: formatDistanceToNow(new Date(webhook.last_triggered_at), { addSuffix: true, locale: dateLocale }),
                      })
                    : t('webhooks.neverTriggered')}
                </span>
                {rate !== null ? (
                  <span className={rate < 60 ? 'text-danger' : ''}>
                    {t('webhooks.rate')} {rate}%
                  </span>
                ) : null}
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-0.5 py-1.5 pr-1">
              <button
                type="button"
                role="switch"
                aria-checked={active}
                aria-label={`${webhook.name}: ${active ? t('webhooks.disable') : t('webhooks.enable')}`}
                title={active ? t('webhooks.disable') : t('webhooks.enable')}
                onClick={() => onToggle(webhook)}
                className="group inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  aria-hidden
                  className={`relative block h-6 w-10 rounded-full transition-colors group-active:opacity-80 ${
                    active ? 'bg-success' : 'bg-border-strong'
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      active ? 'translate-x-4' : ''
                    }`}
                  />
                </span>
              </button>
              <IconMenu
                buttonClassName="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-expanded:bg-surface-hover active:bg-tertiary sm:h-9 sm:w-9"
                label={webhook.name}
                items={[
                  { label: t('webhooks.editAction'), onClick: () => onEdit(webhook) },
                  { label: t('webhooks.delete'), onClick: () => onDelete(webhook.id), danger: true },
                ]}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
