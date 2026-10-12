'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import WebhookList from '@/components/webhooks/WebhookList'
import WebhookForm from '@/components/webhooks/WebhookForm'
import useWorkspaceStore from '@/stores/useWorkspaceStore'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

export default function WebhooksPage() {
  const t = useTranslations('pages.tools')
  const { currentWorkspace } = useWorkspaceStore()
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<any | null>(null)

  const loadWebhooks = useCallback(async () => {
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
  }, [currentWorkspace])

  useEffect(() => {
    if (currentWorkspace) {
      loadWebhooks()
    } else {
      setLoading(false)
    }
  }, [currentWorkspace, loadWebhooks])

  const handleCreate = () => {
    setEditingWebhook(null)
    setShowForm(true)
  }

  const handleEdit = (webhook: any) => {
    setEditingWebhook(webhook)
    setShowForm(true)
  }

  const handleDelete = async (webhookId: string) => {
    if (!confirm(t('webhooks.deleteConfirm'))) return

    try {
      const response = await fetch(`/api/webhooks?webhook_id=${webhookId}`, {
        method: 'DELETE',
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
      <div className="space-y-6">
        <PageHeader title={t('webhooks.title')} description={t('webhooks.subtitle')} />
        <EmptyState title={t('webhooks.noWorkspace')} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('webhooks.title')}
        description={t('webhooks.subtitle')}
        action={
          webhooks.length > 0 ? (
            <Button onClick={handleCreate} className="gap-2" aria-label={t('webhooks.create')}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('webhooks.create')}</span>
            </Button>
          ) : undefined
        }
      />

      <p className="text-sm text-text-secondary">{t('webhooks.aboutBody')}</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : webhooks.length === 0 ? (
        <EmptyState
          title={t('webhooks.emptyTitle')}
          body={t('webhooks.emptyBody')}
          action={
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('webhooks.create')}
            </Button>
          }
        />
      ) : (
        <WebhookList webhooks={webhooks} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {showForm ? (
        <WebhookForm webhook={editingWebhook} workspaceId={currentWorkspace.id} onClose={handleFormClose} />
      ) : null}
    </div>
  )
}
