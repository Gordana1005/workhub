'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const router = useRouter()
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
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setErrors({ general: t('unexpectedError') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="mb-1 text-2xl font-semibold text-text-primary">{t('login.title')}</h1>
        <p className="text-sm text-text-secondary">{t('login.subtitle')}</p>
      </div>

      {errors.general && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('email')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors({ ...errors, email: undefined })
            }}
            className={`block w-full min-w-0 rounded-xl border ${errors.email ? 'border-danger' : 'border-border'} bg-secondary px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40`}
            placeholder={t('emailPlaceholder')}
          />
          {errors.email && <p className="mt-1.5 text-sm text-danger">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('password')}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors({ ...errors, password: undefined })
              }}
              className={`block w-full min-w-0 rounded-xl border ${errors.password ? 'border-danger' : 'border-border'} bg-secondary px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 pr-12`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary"
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-sm text-danger">{errors.password}</p>}
        </div>

        <Button type="submit" size="lg" fullWidth disabled={loading}>
          {loading ? t('login.signingIn') : t('signIn')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        {t('login.noAccount')}{' '}
        <Link href="/auth/signup" className="font-medium text-primary hover:underline">
          {t('login.signUp')}
        </Link>
      </p>
    </div>
  )
}

export default LoginForm;
export { LoginForm };