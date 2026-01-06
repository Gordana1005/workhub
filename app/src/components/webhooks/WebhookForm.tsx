'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, AlertCircle, Check } from 'lucide-react'

interface WebhookFormProps {
  webhook?: any
  workspaceId: string
  onClose: () => void
}

const AVAILABLE_EVENTS = [
  { value: 'task.created', label: 'Task Created', description: 'When a new task is created' },
  { value: 'task.updated', label: 'Task Updated', description: 'When a task is modified' },
  { value: 'task.completed', label: 'Task Completed', description: 'When a task is marked as complete' },
  { value: 'task.deleted', label: 'Task Deleted', description: 'When a task is deleted' },
  { value: 'project.created', label: 'Project Created', description: 'When a new project is created' },
  { value: 'project.updated', label: 'Project Updated', description: 'When a project is modified' },
  { value: 'project.deleted', label: 'Project Deleted', description: 'When a project is deleted' },
  { value: 'comment.created', label: 'Comment Created', description: 'When a comment is added' },
  { value: 'time_entry.created', label: 'Time Entry Created', description: 'When time is tracked' }
]

export default function WebhookForm({ webhook, workspaceId, onClose }: WebhookFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    events: [] as string[],
    verify_ssl: true
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
        verify_ssl: webhook.verify_ssl !== false
      })
    }
  }, [webhook])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    if (!formData.url.trim()) {
      setError('URL is required')
      return
    }

    try {
      new URL(formData.url)
    } catch {
      setError('Invalid URL format')
      return
    }

    if (formData.events.length === 0) {
      setError('Select at least one event')
      return
    }

    setLoading(true)

    try {
      const method = webhook ? 'PATCH' : 'POST'
      const body = webhook
        ? { webhook_id: webhook.id, ...formData }
        : { workspace_id: workspaceId, ...formData }

      const response = await fetch('/api/webhooks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save webhook')
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save webhook')
    } finally {
      setLoading(false)
    }
  }

  const toggleEvent = (eventValue: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }))
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">
              {webhook ? 'Edit Webhook' : 'Create Webhook'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Slack Notifications"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Webhook URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com/webhook"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                POST requests will be sent to this URL
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Events */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Events <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <label
                    key={event.value}
                    className="flex items-start gap-3 p-3 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event.value)}
                      onChange={() => toggleEvent(event.value)}
                      className="mt-1 w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{event.label}</span>
                        {formData.events.includes(event.value) && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{event.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Verify SSL */}
            <div className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-700 rounded-lg">
              <input
                type="checkbox"
                id="verify_ssl"
                checked={formData.verify_ssl}
                onChange={(e) => setFormData({ ...formData, verify_ssl: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <label htmlFor="verify_ssl" className="flex-1 cursor-pointer">
                <span className="text-sm font-medium text-white block">Verify SSL Certificate</span>
                <span className="text-xs text-slate-500">Recommended for security (uncheck for local development)</span>
              </label>
            </div>

            {/* Security Info */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-slate-300">
                <strong className="text-white">Security:</strong> All webhook payloads are signed with HMAC-SHA256.
                Verify the <code className="px-1 py-0.5 bg-slate-900 text-green-400 rounded text-xs">X-Webhook-Signature</code> header
                using your secret key to ensure authenticity.
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {webhook ? 'Save Changes' : 'Create Webhook'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
