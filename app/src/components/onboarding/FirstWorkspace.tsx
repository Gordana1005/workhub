'use client'

/**
 * FirstWorkspace - full-page step shown by dashboard/layout.tsx when a signed-in user has ZERO workspaces
 * (e.g. they confirmed their email and skipped /auth/onboarding, or were invited but have not accepted yet).
 *
 *   1. "Choose a username" - only if the profile row is missing or has an empty username. Same table call the
 *      OnboardingForm uses (profiles.upsert), restricted to id / email / username.
 *   2. "Create your workspace" - name only, through the store's createWorkspace (POST /api/workspaces). When it
 *      succeeds the store holds the new workspace, the layout re-renders and the dashboard appears.
 *
 * A best-effort lookup shows "you have a pending invitation" with a link to /join?token=... when the invitations
 * table lets this user see their own rows (RLS may hide it; then the banner is simply not shown).
 */
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { MailPlus } from 'lucide-react'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/

type Phase = 'checking' | 'username' | 'workspace'

function suggestUsername(email: string | undefined) {
  const local = (email || '').split('@')[0] || ''
  return local.toLowerCase().replace(/[^a-z0-9_.-]/g, '_').slice(0, 30)
}

export default function FirstWorkspace() {
  const t = useTranslations('onboarding.first')
  const router = useRouter()
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace)
  const clearError = useWorkspaceStore((state) => state.clearError)

  const [phase, setPhase] = useState<Phase>('checking')
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState<string | undefined>()
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let needUsername = false
      try {
        const { data } = await supabase.auth.getUser()
        const user = data.user
        if (!user || cancelled) {
          if (!cancelled) setPhase('workspace')
          return
        }
        setUserId(user.id)
        setEmail(user.email)

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle()
        // A failed lookup must never block the workspace step; only a confirmed missing username asks for one.
        if (!profileError && !profile?.username?.trim()) {
          needUsername = true
          setUsername(suggestUsername(user.email))
        }

        if (user.email) {
          const { data: invites } = await supabase
            .from('invitations')
            .select('token, status')
            .eq('email', user.email.toLowerCase())
            .eq('status', 'pending')
            .limit(1)
          const token = invites?.[0]?.token
          if (!cancelled && typeof token === 'string' && token) setInviteToken(token)
        }
      } catch {
        // fall through to the workspace step
      }
      if (!cancelled) setPhase(needUsername ? 'username' : 'workspace')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const saveUsername = async (event: FormEvent) => {
    event.preventDefault()
    const value = username.trim()
    if (busy) return
    if (!USERNAME_RE.test(value)) {
      setError(t('usernameInvalid'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error: upsertError } = await supabase.from('profiles').upsert({ id: userId, email, username: value })
      if (upsertError) {
        const taken = upsertError.code === '23505' || /duplicate|unique/i.test(upsertError.message)
        setError(taken ? t('usernameTaken') : t('usernameFailed'))
        return
      }
      setPhase('workspace')
    } catch {
      setError(t('usernameFailed'))
    } finally {
      setBusy(false)
    }
  }

  const saveWorkspace = async (event: FormEvent) => {
    event.preventDefault()
    const value = name.trim()
    if (!value || busy) return
    setBusy(true)
    setError(null)
    clearError()
    try {
      const workspace = await createWorkspace(value)
      if (!workspace) setError(t('workspaceFailed'))
      else router.refresh()
    } catch {
      setError(t('workspaceFailed'))
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      router.push('/auth/login')
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg sm:p-8">
        {phase === 'checking' ? (
          <div role="status" aria-busy="true" className="space-y-3 py-6">
            <span className="sr-only">{t('checking')}</span>
            <div aria-hidden className="skeleton mx-auto h-6 w-2/3 rounded-lg" />
            <div aria-hidden className="skeleton mx-auto h-4 w-1/2 rounded-lg" />
            <div aria-hidden className="skeleton h-11 w-full rounded-lg" />
          </div>
        ) : phase === 'username' ? (
          <form onSubmit={saveUsername} noValidate className="space-y-5">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-text-primary">{t('usernameTitle')}</h1>
              <p className="mt-1.5 text-sm text-text-secondary">{t('usernameBody')}</p>
            </div>
            <Field label={t('usernameLabel')} hint={t('usernameHint')} error={error ?? undefined} required>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                autoFocus
                placeholder={t('usernamePlaceholder')}
              />
            </Field>
            <Button type="submit" size="lg" fullWidth loading={busy} disabled={!username.trim()}>
              {t('usernameContinue')}
            </Button>
          </form>
        ) : (
          <form onSubmit={saveWorkspace} noValidate className="space-y-5">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-text-primary">{t('workspaceTitle')}</h1>
              <p className="mt-1.5 text-sm text-text-secondary">{t('workspaceBody')}</p>
            </div>

            {inviteToken ? (
              <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
                <MailPlus aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{t('inviteTitle')}</p>
                  <p className="text-xs text-text-secondary">{t('inviteBody')}</p>
                  <Link
                    href={`/join?token=${encodeURIComponent(inviteToken)}`}
                    className={`${buttonClasses({ variant: 'primary', size: 'sm' })} mt-2`}
                  >
                    {t('inviteOpen')}
                  </Link>
                </div>
              </div>
            ) : null}

            <Field label={t('workspaceLabel')} hint={t('workspaceHint')} error={error ?? undefined} required>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                enterKeyHint="go"
                autoFocus={!inviteToken}
                maxLength={80}
                placeholder={t('workspacePlaceholder')}
              />
            </Field>
            <Button type="submit" size="lg" fullWidth loading={busy} disabled={!name.trim()}>
              {t('workspaceCreate')}
            </Button>
          </form>
        )}

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t('signOut')}
          </button>
        </div>
      </div>
    </main>
  )
}
