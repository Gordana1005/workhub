export const EVENT_LABEL_KEYS: Record<string, string> = {
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

export interface Webhook {
  id: string
  name: string
  url: string
  description: string | null
  events: string[]
  active: boolean
  verify_ssl?: boolean
  success_count: number
  failure_count: number
  last_triggered_at: string | null
  created_at: string
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function successRate(webhook: Webhook) {
  const total = webhook.success_count + webhook.failure_count
  return total === 0 ? null : Math.round((webhook.success_count / total) * 100)
}

export type WebhookHealth = 'paused' | 'failing' | 'idle' | 'healthy'

export function healthOf(webhook: Webhook, active: boolean): WebhookHealth {
  if (!active) return 'paused'
  const rate = successRate(webhook)
  if (rate === null) return 'idle'
  return rate < 60 ? 'failing' : 'healthy'
}
