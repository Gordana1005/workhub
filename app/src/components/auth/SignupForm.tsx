'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { safeNextPath } from '@/lib/safeNext'
import PasswordInput, { authInputClass } from '@/components/auth/PasswordInput'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const nextParam = useSearchParams().get('next')
  const next = safeNextPath(nextParam, '')
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : ''
  const t = useTranslations('pages.auth')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError(t('signup.passwordMismatch'))
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback${nextQuery}`,
        }
      })

      if (error) {
        setError(error.message)
      } else if (data.session) {
        router.push(`/auth/onboarding${nextQuery}`)
      } else {
        setError(t('signup.checkEmail'))
      }
    } catch (err) {
      setError(t('unexpectedError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg min-[400px]:p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="mb-1 break-words text-2xl font-semibold text-text-primary">{t('signup.title')}</h1>
        <p className="text-sm text-text-secondary">{t('signup.subtitle')}</p>
      </div>

      <div aria-live="assertive">
        {error && (
          <div className="mb-4 break-words rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
            {error}
          </div>
        )}
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass()}
            placeholder={t('emailPlaceholder')}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('password')}
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder={t('signup.passwordPlaceholder')}
            required
            enterKeyHint="next"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('signup.confirmPassword')}
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            placeholder={t('signup.confirmPasswordPlaceholder')}
            invalid={Boolean(error) && password !== confirmPassword}
            required
            enterKeyHint="go"
          />
        </div>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {loading ? t('signup.creating') : t('signup.createAccount')}
        </Button>
      </form>

      <p className="mt-3 text-center text-sm text-text-secondary">
        {t('alreadyHaveAccount')}{' '}
        <Link href={`/auth/login${nextQuery}`} className="inline-flex min-h-11 items-center px-1 font-medium text-primary hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  )
}
