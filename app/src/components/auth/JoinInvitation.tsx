'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Clock, KeyRound, MailX, Users } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import PasswordInput from '@/components/auth/PasswordInput'
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

/**
 * People who arrive through the Supabase invite e-mail are already signed in on a temporary session
 * but have never chosen a password. `needs_password` is set in the invite data; accounts invited
 * before that flag existed are recognised by `invited_at`.
 */
function userNeedsPassword(user: User | null): boolean {
  if (!user) return false
  const meta = (user.user_metadata || {}) as Record<string, unknown>
  if (meta.needs_password === true) return true
  return meta.needs_password === undefined && Boolean(user.invited_at)
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg min-[400px]:p-6 sm:p-8">
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
      <h1 className="mb-1 break-words text-xl font-semibold text-text-primary">{title}</h1>
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
  const [linkExpired, setLinkExpired] = useState(false)
  const [step, setStep] = useState<'accept' | 'password'>('accept')
  const [joined, setJoined] = useState<{ workspaceName: string; needsProfile: boolean } | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const load = useCallback(async () => {
    if (!token) {
      setView({ kind: 'error', reason: 'missing' })
      return
    }
    setView({ kind: 'loading' })
    try {
      // The invite e-mail lands here with the session in the URL hash; let the client store it
      // (cookies) before asking the server who is signed in.
      if (/error(_code)?=/.test(window.location.hash)) setLinkExpired(true)
      await supabase.auth.getSession().catch(() => null)
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
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      if (userNeedsPassword(user)) {
        setJoined({ workspaceName: data.workspaceName || '', needsProfile: Boolean(data.needsProfile) })
        setStep('password')
        setAccepting(false)
        return
      }
      finish(Boolean(data.needsProfile))
    } catch {
      setError(t('acceptFailed'))
      setAccepting(false)
    }
  }

  // Invitees without a username go through onboarding first, then land on the dashboard
  const finish = (needsProfile: boolean) => {
    router.push(needsProfile ? `/auth/onboarding?next=${encodeURIComponent('/dashboard')}` : '/dashboard')
    router.refresh()
  }

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (savingPassword) return
    if (password.length < 8) {
      setPasswordError(t('passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setPasswordError(t('passwordMismatch'))
      return
    }
    setSavingPassword(true)
    setPasswordError(null)
    const { error: updateError } = await supabase.auth
      .updateUser({ password, data: { needs_password: false, password_set: true } })
      .catch(() => ({ error: new Error('update') }))
    if (updateError) {
      setPasswordError(t('passwordFailed'))
      setSavingPassword(false)
      return
    }
    finish(joined?.needsProfile ?? false)
  }

  const switchAccount = async () => {
    try {
      await supabase.auth.signOut()
      await (await import('@/lib/clear-client-cache')).clearClientCaches()
    } catch {}
    router.push(`/auth/login${nextQuery}`)
    router.refresh()
  }

  if (step === 'password') {
    return (
      <Shell>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mb-1 break-words text-2xl font-semibold text-text-primary">{t('setPasswordTitle')}</h1>
          <p className="text-sm text-text-secondary">{t('setPasswordBody', { workspace: joined?.workspaceName || '' })}</p>
        </div>

        {passwordError ? (
          <div className="mb-4 break-words rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
            {passwordError}
          </div>
        ) : null}

        <form onSubmit={savePassword} className="space-y-4" noValidate>
          <div>
            <label htmlFor="join-password" className="mb-1.5 block text-sm font-medium text-text-secondary">
              {t('newPassword')}
            </label>
            <PasswordInput id="join-password" value={password} onChange={setPassword} autoComplete="new-password" enterKeyHint="next" required />
          </div>
          <div>
            <label htmlFor="join-password-confirm" className="mb-1.5 block text-sm font-medium text-text-secondary">
              {t('confirmPassword')}
            </label>
            <PasswordInput
              id="join-password-confirm"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              enterKeyHint="go"
              required
            />
          </div>
          <Button type="submit" size="lg" fullWidth loading={savingPassword}>
            {savingPassword ? t('savingPassword') : t('savePassword')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            disabled={savingPassword}
            onClick={() => finish(joined?.needsProfile ?? false)}
          >
            {t('skipPassword')}
          </Button>
        </form>
      </Shell>
    )
  }

  if (view.kind === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6 text-sm text-text-secondary" role="status" aria-live="polite">
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
          {view.reason === 'load' ? <Button size="lg" onClick={load}>{t('retry')}</Button> : null}
          <Link href="/dashboard" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
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
          <Link href="/dashboard" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
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
          <Link href="/dashboard" className={buttonClasses({ size: 'lg' })}>
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
          <Button size="lg" className="h-auto min-h-12 whitespace-normal py-2 text-center" onClick={switchAccount}>{t('switchAccount')}</Button>
          <Link href="/dashboard" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
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
        <h1 className="mb-1 break-words text-2xl font-semibold text-text-primary">
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
        <Button size="lg" fullWidth className="h-auto min-h-12 whitespace-normal py-2" onClick={accept} loading={accepting}>
          {accepting ? t('accepting') : t('accept')}
        </Button>
      ) : (
        <div className="space-y-3">
          {linkExpired ? (
            <p role="alert" className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-text-primary">
              {t('linkExpired')}
            </p>
          ) : null}
          <p className="text-center text-sm text-text-secondary">{t('signInPrompt')}</p>
          <Link href={`/auth/login${nextQuery}`} className={buttonClasses({ size: 'lg', fullWidth: true, className: 'h-auto min-h-12 whitespace-normal py-2 text-center' })}>
            {t('signIn')}
          </Link>
          <Link
            href={`/auth/signup${nextQuery}`}
            className={buttonClasses({ size: 'lg', fullWidth: true, variant: 'secondary', className: 'h-auto min-h-12 whitespace-normal py-2 text-center' })}
          >
            {t('createAccount')}
          </Link>
        </div>
      )}
    </Shell>
  )
}
