'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

type Status = 'loading' | 'ready' | 'unavailable'

/**
 * Daily digest opt-out. Self-contained: loads and saves through /api/push/prefs and
 * degrades to a disabled switch when the preference storage is not available yet.
 */
export default function NotificationPrefs() {
  const t = useTranslations('pages.tools')
  const locale = useLocale()
  const [status, setStatus] = useState<Status>('loading')
  const [digest, setDigest] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/push/prefs', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        if (!data?.available) {
          setStatus('unavailable')
          return
        }
        setDigest(data.prefs?.daily_digest !== false)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = async () => {
    if (saving || status !== 'ready') return
    const next = !digest
    setDigest(next)
    setSaving(true)
    setError(false)
    try {
      const res = await fetch('/api/push/prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_digest: next, locale }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      setDigest(!next)
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  const disabled = status !== 'ready' || saving

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
      <div className="min-w-0">
        <p id="digest-label" className="text-sm font-medium text-text-primary">
          {t('settings.push.digestTitle')}
        </p>
        <p className="mt-0.5 text-sm text-text-secondary">{t('settings.push.digestHelp')}</p>
        {status === 'unavailable' ? (
          <p className="mt-2 text-sm text-text-secondary">{t('settings.push.digestUnavailable')}</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {t('settings.push.digestSaveFailed')}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={digest}
        aria-labelledby="digest-label"
        disabled={disabled}
        onClick={toggle}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 ${
          digest && status === 'ready' ? 'bg-primary' : 'bg-text-muted'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            digest && status === 'ready' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
