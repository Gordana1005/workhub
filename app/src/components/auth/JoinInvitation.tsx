'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Clock, MailX, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

interface Preview {
  workspaceName: string | null
  role: 'admin' | 'member'
  inviterName: string | null
  expiresAt: string | null
  state: 'pending' | 'accepted' | 'expired' | 'revoked'
  signedIn: boolean
  emailMatches?: boolean
}

type View =
  | { kind: 'loading' }
  | { kind: 'ready'; preview: Preview }
  | { kind: 'error'; reason: 'missing' | 'invalid' | 'load' }

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-8">
      {children}
    </div>
  )
}

function Notice({ icon, title, body, children }: { icon: ReactNode; title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft text-warning">
        {icon}
      </div>
      <h1 className="mb-1 text-xl font-semibold text-text-primary">{title}</h1>
      {body ? <p className="text-sm text-text-secondary">{body}</p> : null}
      {children ? <div className="mt-6 flex flex-col gap-2">{children}</div> : null}
    </div>
  )
}

export default function JoinInvitation() {
  const t = useTranslations('pages.auth.join')
  const locale = useLocale()
  const router = useRouter()
  const token = useSearchParams().get('token')
  const [view, setView] = useState<View>({ kind: 'loading' })
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) {
      setView({ kind: 'error', reason: 'missing' })
      return
    }
    setView({ kind: 'loading' })
    try {
      const response = await fetch(`/api/invitations/accept?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      if (response.status === 404) {
        setView({ kind: 'error', reason: 'invalid' })
        return
      }
      if (!response.ok) throw new Error('load')
      setView({ kind: 'ready', preview: await response.json() })
    } catch {
      setView({ kind: 'error', reason: 'load' })
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const joinPath = token ? `/join?token=${encodeURIComponent(token)}` : '/join'
  const nextQuery = `?next=${encodeURIComponent(joinPath)}`

  const accept = async () => {
    if (!token || accepting) return
    setAccepting(true)
    setError(null)
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) {
        router.push(`/auth/login${nextQuery}`)
        return
      }
      if (!response.ok) {
        if (data.code) {
          // Re-read the preview so the page shows the right state (expired / used / wrong account)
          await load()
        } else {
          setError(t('acceptFailed'))
        }
        setAccepting(false)
        return
      }
      // Make the joined workspace current; the dashboard refreshes it from the server on load
      useWorkspaceStore.getState().setCurrentWorkspace({
        id: data.workspaceId,
        name: data.workspaceName || '',
        owner_id: '',
        created_at: '',
      })
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError(t('acceptFailed'))
      setAccepting(false)
    }
  }

  const switchAccount = async () => {
    try {
      await supabase.auth.signOut()
    } catch {}
    router.push(`/auth/login${nextQuery}`)
    router.refresh()
  }

  if (view.kind === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6 text-sm text-text-secondary" role="status">
          <Spinner className="h-6 w-6 text-primary" />
          {t('loading')}
        </div>
      </Shell>
    )
  }

  if (view.kind === 'error') {
    const copy = {
      missing: [t('missingTitle'), t('missingBody')],
      invalid: [t('invalidTitle'), t('invalidBody')],
      load: [t('invalidTitle'), t('loadFailed')],
    }[view.reason]
    return (
      <Shell>
        <Notice icon={<AlertTriangle className="h-6 w-6" aria-hidden />} title={copy[0]} body={copy[1]}>
          {view.reason === 'load' ? <Button onClick={load}>{t('retry')}</Button> : null}
          <Link href="/dashboard" className={buttonClasses({ variant: 'secondary' })}>
            {t('goToDashboard')}
          </Link>
        </Notice>
      </Shell>
    )
  }

  const { preview } = view

  if (preview.state === 'expired' || preview.state === 'revoked') {
    return (
      <Shell>
        <Notice icon={<Clock className="h-6 w-6" aria-hidden />} title={t('expiredTitle')} body={t('expiredBody')}>
          <Link href="/dashboard" className={buttonClasses({ variant: 'secondary' })}>
            {t('goToDashboard')}
          </Link>
        </Notice>
      </Shell>
    )
  }

  if (preview.state === 'accepted') {
    return (
      <Shell>
        <Notice icon={<Users className="h-6 w-6" aria-hidden />} title={t('usedTitle')} body={t('usedBody')}>
          <Link href="/dashboard" className={buttonClasses()}>
            {t('goToDashboard')}
          </Link>
        </Notice>
      </Shell>
    )
  }

  if (preview.signedIn && preview.emailMatches === false) {
    return (
      <Shell>
        <Notice icon={<MailX className="h-6 w-6" aria-hidden />} title={t('mismatchTitle')} body={t('mismatchBody')}>
          <Button onClick={switchAccount}>{t('switchAccount')}</Button>
          <Link href="/dashboard" className={buttonClasses({ variant: 'secondary' })}>
            {t('goToDashboard')}
          </Link>
        </Notice>
      </Shell>
    )
  }

  const workspaceName = preview.workspaceName || ''
  const expires = preview.expiresAt
    ? new Date(preview.expiresAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <Shell>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mb-1 text-2xl font-semibold text-text-primary">
          {workspaceName ? t('title', { workspace: workspaceName }) : t('titleFallback')}
        </h1>
        <p className="text-sm text-text-secondary">
          {preview.inviterName ? t('invitedBy', { inviter: preview.inviterName }) : t('invitedGeneric')}
        </p>
      </div>

      <dl className="mb-4 divide-y divide-border rounded-xl border border-border bg-secondary text-sm">
        {workspaceName ? (
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-text-secondary">{t('workspace')}</dt>
            <dd className="min-w-0 truncate font-medium text-text-primary">{workspaceName}</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-text-secondary">{t('role')}</dt>
          <dd className="font-medium text-text-primary">
            {preview.role === 'admin' ? t('roleAdmin') : t('roleMember')}
          </dd>
        </div>
      </dl>

      <p className="mb-1 text-center text-xs text-text-muted">
        {preview.role === 'admin' ? t('roleAdminHelp') : t('roleMemberHelp')}
      </p>
      {expires ? <p className="mb-5 text-center text-xs text-text-muted">{t('expires', { date: expires })}</p> : <div className="mb-5" />}

      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
          {error}
        </div>
      ) : null}

      {preview.signedIn ? (
        <Button size="lg" fullWidth onClick={accept} loading={accepting}>
          {accepting ? t('accepting') : t('accept')}
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm text-text-secondary">{t('signInPrompt')}</p>
          <Link href={`/auth/login${nextQuery}`} className={buttonClasses({ size: 'lg', fullWidth: true })}>
            {t('signIn')}
          </Link>
          <Link
            href={`/auth/signup${nextQuery}`}
            className={buttonClasses({ size: 'lg', fullWidth: true, variant: 'secondary' })}
          >
            {t('createAccount')}
          </Link>
        </div>
      )}
    </Shell>
  )
}
