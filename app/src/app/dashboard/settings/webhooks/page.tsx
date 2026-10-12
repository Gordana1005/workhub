'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import WebhookList from '@/components/webhooks/WebhookList'
import WebhookForm from '@/components/webhooks/WebhookForm'
import WebhookDetail from '@/components/webhooks/WebhookDetail'
import type { Webhook } from '@/components/webhooks/shared'
import useWorkspaceStore from '@/stores/useWorkspaceStore'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

/** True once the viewport reaches xl, where the delivery log sits in a side panel instead of a dialog. */
function useIsWide() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)')
    const update = () => setWide(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return wide
}

export default function WebhooksPage() {
  const t = useTranslations('pages.tools')
  const { confirm, dialog } = useConfirm()
  const { currentWorkspace } = useWorkspaceStore()
  const wide = useIsWide()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeOverride, setActiveOverride] = useState<Record<string, boolean>>({})

  const loadWebhooks = useCallback(async () => {
    if (!currentWorkspace) return

    try {
      const response = await fetch(`/api/webhooks?workspace_id=${currentWorkspace.id}`)
      const data = await response.json()

      if (response.ok) {
        setWebhooks(data.webhooks || [])
        setActiveOverride({})
      }
    } catch (error) {
      console.error('Error loading webhooks:', error)
    } finally {
      setLoading(false)
    }
  // Only the workspace id matters: the store hands out a fresh object on every refresh, which would refetch needlessly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id])

  useEffect(() => {
    if (currentWorkspace) {
      setLoading(true)
      loadWebhooks()
    } else {
      setLoading(false)
    }
  }, [currentWorkspace, loadWebhooks])

  const activeOf = (webhook: Webhook) => activeOverride[webhook.id] ?? webhook.active

  const handleToggle = async (webhook: Webhook) => {
    const next = !activeOf(webhook)
    setActiveOverride((prev) => ({ ...prev, [webhook.id]: next }))
    try {
      const response = await fetch('/api/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_id: webhook.id, active: next }),
      })
      if (!response.ok) throw new Error('toggle failed')
    } catch (error) {
      console.error('Error toggling webhook:', error)
      setActiveOverride((prev) => ({ ...prev, [webhook.id]: !next }))
    }
  }

  const handleCreate = () => {
    setEditingWebhook(null)
    setShowForm(true)
  }

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook)
    setShowForm(true)
  }

  const handleDelete = async (webhookId: string) => {
    if (!(await confirm({ title: t('webhooks.deleteConfirm'), confirmLabel: t('webhooks.delete') }))) return

    try {
      const response = await fetch(`/api/webhooks?webhook_id=${webhookId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        if (selectedId === webhookId) setSelectedId(null)
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

  const selected = webhooks.find((webhook) => webhook.id === selectedId) || null
  // On wide screens the panel always shows something: the selection, or the first webhook.
  const panelWebhook = selected || webhooks[0] || null

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title={t('webhooks.title')}
        description={t('webhooks.subtitle')}
        action={
          webhooks.length > 0 ? (
            <Button onClick={handleCreate} className="gap-2" aria-label={t('webhooks.create')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t('webhooks.create')}</span>
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : webhooks.length === 0 ? (
        <EmptyState
          title={t('webhooks.emptyTitle')}
          body={t('webhooks.aboutBody')}
          action={
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('webhooks.create')}
            </Button>
          }
        />
      ) : (
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-w-0 space-y-3">
            <WebhookList
              webhooks={webhooks}
              selectedId={wide ? panelWebhook?.id ?? null : selectedId}
              activeOf={activeOf}
              onSelect={(webhook) => setSelectedId(webhook.id)}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            <p className="px-1 text-xs text-text-secondary">{t('webhooks.aboutBody')}</p>
          </div>

          {wide && panelWebhook ? (
            <aside
              aria-label={t('webhooks.deliveries')}
              className="min-w-0 rounded-2xl border border-border bg-surface p-5"
            >
              <WebhookDetail
                key={panelWebhook.id}
                webhook={panelWebhook}
                active={activeOf(panelWebhook)}
                onEdit={handleEdit}
              />
            </aside>
          ) : null}
        </div>
      )}

      {!wide && selected ? (
        <Dialog open title={selected.name} onClose={() => setSelectedId(null)} size="lg">
          <WebhookDetail key={selected.id} webhook={selected} active={activeOf(selected)} onEdit={handleEdit} />
        </Dialog>
      ) : null}

      {showForm ? (
        <WebhookForm webhook={editingWebhook} workspaceId={currentWorkspace.id} onClose={handleFormClose} />
      ) : null}
      {dialog}
    </div>
  )
}
