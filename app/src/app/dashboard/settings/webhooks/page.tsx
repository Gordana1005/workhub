'use client'

import { useState, useEffect } from 'react'
import { Plus, Webhook, Activity, AlertCircle } from 'lucide-react'
import WebhookList from '@/components/webhooks/WebhookList'
import WebhookForm from '@/components/webhooks/WebhookForm'
import useWorkspaceStore from '@/stores/useWorkspaceStore'

export default function WebhooksPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<any | null>(null)

  useEffect(() => {
    if (currentWorkspace) {
      loadWebhooks()
    }
  }, [currentWorkspace])

  const loadWebhooks = async () => {
    if (!currentWorkspace) return

    try {
      setLoading(true)
      const response = await fetch(`/api/webhooks?workspace_id=${currentWorkspace.id}`)
      const data = await response.json()

      if (response.ok) {
        setWebhooks(data.webhooks || [])
      }
    } catch (error) {
      console.error('Error loading webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingWebhook(null)
    setShowForm(true)
  }

  const handleEdit = (webhook: any) => {
    setEditingWebhook(webhook)
    setShowForm(true)
  }

  const handleDelete = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      const response = await fetch(`/api/webhooks?webhook_id=${webhookId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadWebhooks()
      }
    } catch (error) {
      console.error('Error deleting webhook:', error)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingWebhook(null)
    loadWebhooks()
  }

  if (!currentWorkspace) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-full py-20">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No workspace selected</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Webhook className="w-7 h-7 text-blue-500" />
            Webhooks
          </h1>
          <p className="text-slate-400 mt-1">
            Configure external integrations via HTTP callbacks
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Webhook
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-slate-300">
            <p className="font-medium text-white mb-1">About Webhooks</p>
            <p>
              Webhooks allow external services to receive real-time notifications when events occur in WorkHub.
              All webhook payloads are signed with HMAC-SHA256 for security verification.
            </p>
          </div>
        </div>
      </div>

      {/* Webhook List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12">
          <Webhook className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No webhooks configured</h3>
          <p className="text-slate-400 mb-6">
            Create your first webhook to start receiving event notifications
          </p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Webhook
          </button>
        </div>
      ) : (
        <WebhookList
          webhooks={webhooks}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Webhook Form Modal */}
      {showForm && (
        <WebhookForm
          webhook={editingWebhook}
          workspaceId={currentWorkspace.id}
          onClose={handleFormClose}
        />
      )}
    </div>
  )
}
