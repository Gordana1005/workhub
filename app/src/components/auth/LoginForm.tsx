'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { safeNextPath } from '@/lib/safeNext'
import PasswordInput, { authInputClass } from '@/components/auth/PasswordInput'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const router = useRouter()
  const nextParam = useSearchParams().get('next')
  const next = safeNextPath(nextParam)
  const signupHref = nextParam && next === nextParam ? `/auth/signup?next=${encodeURIComponent(next)}` : '/auth/signup'
  const t = useTranslations('pages.auth')

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!email) {
      newErrors.email = t('login.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('login.emailInvalid')
    }

    if (!password) {
      newErrors.password = t('login.passwordRequired')
    } else if (password.length < 8) {
      newErrors.password = t('login.passwordTooShort')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setErrors({ general: error.message })
      } else {
        router.push(next)
        router.refresh()
      }
    } catch (err) {
      setErrors({ general: t('unexpectedError') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg min-[400px]:p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="mb-1 break-words text-2xl font-semibold text-text-primary">{t('login.title')}</h1>
        <p className="text-sm text-text-secondary">{t('login.subtitle')}</p>
      </div>

      <div aria-live="assertive">
        {errors.general && (
          <div className="mb-4 break-words rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
            {errors.general}
          </div>
        )}
      </div>

      <form onSubmit={handleLogin} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            value={email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors({ ...errors, email: undefined })
            }}
            className={authInputClass(Boolean(errors.email))}
            placeholder={t('emailPlaceholder')}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1.5 text-sm text-danger">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('password')}
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(value) => {
              setPassword(value)
              if (errors.password) setErrors({ ...errors, password: undefined })
            }}
            autoComplete="current-password"
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
            describedBy={errors.password ? 'password-error' : undefined}
            enterKeyHint="go"
          />
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1.5 text-sm text-danger">
              {errors.password}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {loading ? t('login.signingIn') : t('signIn')}
        </Button>
      </form>

      <p className="mt-3 text-center text-sm text-text-secondary">
        {t('login.noAccount')}{' '}
        <Link href={signupHref} className="inline-flex min-h-11 items-center px-1 font-medium text-primary hover:underline">
          {t('login.signUp')}
        </Link>
      </p>
    </div>
  )
}

export default LoginForm;
export { LoginForm };
