'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'

type PushState = 'loading' | 'unsupported' | 'unavailable' | 'blocked' | 'off' | 'on'

const READY_TIMEOUT_MS = 15000

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Resolves with the active service worker registration, or null if there is none soon. */
async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  const waitReady = () =>
    Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), READY_TIMEOUT_MS)),
    ])
  try {
    const existing = await waitReady()
    if (existing) return existing
    // No active worker yet (registration is normally automatic): register it ourselves, then wait again
    await navigator.serviceWorker.register('/sw.js')
    return await waitReady()
  } catch {
    return null
  }
}

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

async function saveSubscription(subscription: PushSubscription): Promise<boolean> {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })
  return res.ok
}

/**
 * Self-contained control for web push on this device: shows the state and lets the user
 * enable / disable it. Drop it anywhere inside the (authenticated) dashboard.
 */
export default function PushToggle() {
  const t = useTranslations('pages.tools')
  const locale = useLocale()
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [reason, setReason] = useState('')
  const [showIosNote, setShowIosNote] = useState(false)

  const refresh = useCallback(async () => {
    setShowIosNote(isIos() && !isStandalone())

    if (!isPushSupported()) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setState('blocked')
      return
    }

    try {
      const res = await fetch('/api/push/subscribe', { cache: 'no-store' })
      const status = res.ok ? await res.json() : null
      if (!status?.configured) {
        setReason(res.ok ? String(status?.reason || 'server') : `status_${res.status}`)
        setState('unavailable')
        return
      }

      const registration = await getRegistration()
      if (!registration) {
        setReason('worker')
        setState('unavailable')
        return
      }
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        // Keep the server in sync (e.g. the row was cleaned up after an expiry)
        if (Notification.permission === 'granted') await saveSubscription(subscription).catch(() => false)
        setState('on')
      } else {
        setState('off')
      }
    } catch {
      setReason('exception')
      setState('unavailable')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const enable = async () => {
    setBusy(true)
    setError(false)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setState('blocked')
        return
      }
      if (permission !== 'granted') return

      const registration = await getRegistration()
      if (!registration) throw new Error('no service worker')

      let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      if (!publicKey) {
        const res = await fetch('/api/push/subscribe', { cache: 'no-store' })
        publicKey = (await res.json())?.publicKey || ''
      }
      if (!publicKey) throw new Error('push not configured')

      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }))

      if (!(await saveSubscription(subscription))) {
        await subscription.unsubscribe().catch(() => false)
        throw new Error('save failed')
      }

      // Remember the language so server-side messages (daily digest) match the app
      fetch('/api/push/prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      }).catch(() => {})

      setState('on')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    setError(false)
    try {
      const registration = await getRegistration()
      const subscription = registration ? await registration.pushManager.getSubscription() : null
      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      }
      setState('off')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const statusText: Record<PushState, string> = {
    loading: t('settings.push.working'),
    unsupported: t('settings.push.stateUnsupported'),
    unavailable: t('settings.push.stateUnavailable'),
    blocked: t('settings.push.stateBlocked'),
    off: t('settings.push.stateOff'),
    on: t('settings.push.stateOn'),
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{t('settings.push.title')}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{t('settings.push.help')}</p>
        <p className="mt-2 text-sm font-medium text-text-primary" aria-live="polite">
          {statusText[state]}
        </p>
        {state === 'unavailable' && reason ? (
          <p className="mt-1 text-xs text-text-muted">({reason})</p>
        ) : null}
        {showIosNote && state !== 'on' ? (
          <p className="mt-2 text-sm text-text-secondary">{t('settings.push.iosNote')}</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {t('settings.push.error')}
          </p>
        ) : null}
      </div>
      {state === 'off' ? (
        <Button type="button" variant="primary" onClick={enable} loading={busy} className="shrink-0">
          {t('settings.push.enable')}
        </Button>
      ) : null}
      {state === 'on' ? (
        <Button type="button" variant="secondary" onClick={disable} loading={busy} className="shrink-0">
          {t('settings.push.disable')}
        </Button>
      ) : null}
    </div>
  )
}
