'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MoreVertical, Edit2, Trash2, Power, PowerOff, 
  CheckCircle, XCircle, Activity, ExternalLink, Eye 
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

interface WebhookListProps {
  webhooks: Webhook[]
  onEdit: (webhook: Webhook) => void
  onDelete: (webhookId: string) => void
}

export default function WebhookList({ webhooks, onEdit, onDelete }: WebhookListProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null)

  const toggleActive = async (webhook: Webhook) => {
    try {
      await fetch('/api/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_id: webhook.id,
          active: !webhook.active
        })
      })
      window.location.reload()
    } catch (error) {
      console.error('Error toggling webhook:', error)
    }
  }

  const getSuccessRate = (webhook: Webhook) => {
    const total = webhook.success_count + webhook.failure_count
    if (total === 0) return 0
    return Math.round((webhook.success_count / total) * 100)
  }

  return (
    <div className="space-y-3">
      {webhooks.map((webhook, index) => (
        <motion.div
          key={webhook.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors"
        >
          {/* Main Row */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-medium text-white truncate">
                    {webhook.name}
                  </h3>
                  
                  {webhook.active ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                      <Power className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-600/50 text-slate-400 text-xs font-medium rounded-full">
                      <PowerOff className="w-3 h-3" />
                      Inactive
                    </span>
                  )}
                </div>

                {webhook.description && (
                  <p className="text-sm text-slate-400 mb-2">
                    {webhook.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    {new URL(webhook.url).hostname}
                  </span>
                  <span>{webhook.events.length} events</span>
                  {webhook.last_triggered_at && (
                    <span>
                      Last triggered {formatDistanceToNow(new Date(webhook.last_triggered_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-lg font-semibold">{webhook.success_count}</span>
                  </div>
                  <span className="text-xs text-slate-500">Success</span>
                </div>

                <div className="text-center">
                  <div className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-lg font-semibold">{webhook.failure_count}</span>
                  </div>
                  <span className="text-xs text-slate-500">Failed</span>
                </div>

                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-400">
                    {getSuccessRate(webhook)}%
                  </div>
                  <span className="text-xs text-slate-500">Rate</span>
                </div>
              </div>

              {/* Actions Menu */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setActiveMenu(activeMenu === webhook.id ? null : webhook.id)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </button>

                {activeMenu === webhook.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setActiveMenu(null)}
                    />
                    <div className="absolute right-0 top-10 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 py-1">
                      <button
                        onClick={() => {
                          setExpandedWebhook(expandedWebhook === webhook.id ? null : webhook.id)
                          setActiveMenu(null)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          toggleActive(webhook)
                          setActiveMenu(null)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                      >
                        {webhook.active ? (
                          <>
                            <PowerOff className="w-4 h-4" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4" />
                            Enable
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          onEdit(webhook)
                          setActiveMenu(null)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          onDelete(webhook.id)
                          setActiveMenu(null)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {expandedWebhook === webhook.id && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-700 bg-slate-800/50 p-4 space-y-3"
            >
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Webhook URL</h4>
                <code className="block px-3 py-2 bg-slate-900 text-green-400 text-xs rounded border border-slate-700 overflow-x-auto">
                  {webhook.url}
                </code>
              </div>

              <div>
                <h4 className="text-sm font-medium text-white mb-2">Subscribed Events</h4>
                <div className="flex flex-wrap gap-2">
                  {webhook.events.map(event => (
                    <span
                      key={event}
                      className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Created {formatDistanceToNow(new Date(webhook.created_at), { addSuffix: true })}
                </span>
                <a
                  href={`/dashboard/settings/webhooks/${webhook.id}/logs`}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Activity className="w-3 h-3" />
                  View Logs
                </a>
              </div>
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
