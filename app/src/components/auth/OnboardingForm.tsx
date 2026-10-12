'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

export default function OnboardingForm() {
  const [username, setUsername] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const t = useTranslations('pages.auth')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        setError(t('onboarding.notAuthenticated'))
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          username,
          job_title: jobTitle,
          department
        })

      if (profileError) {
        setError(profileError.message)
      } else {
        setSuccess(t('onboarding.saved'))
        router.push('/dashboard')
      }
    } catch (err) {
      setError(t('unexpectedError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="mb-1 text-2xl font-semibold text-text-primary">{t('onboarding.title')}</h1>
        <p className="text-sm text-text-secondary">{t('onboarding.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success" role="status">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('onboarding.username')}
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="block w-full min-w-0 rounded-xl border border-border bg-secondary px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder={t('onboarding.usernamePlaceholder')}
            required
          />
        </div>
        <div>
          <label htmlFor="jobTitle" className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('onboarding.jobTitle')}
          </label>
          <input
            id="jobTitle"
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="block w-full min-w-0 rounded-xl border border-border bg-secondary px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder={t('onboarding.jobTitlePlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="department" className="mb-1.5 block text-sm font-medium text-text-secondary">
            {t('onboarding.department')}
          </label>
          <input
            id="department"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="block w-full min-w-0 rounded-xl border border-border bg-secondary px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder={t('onboarding.departmentPlaceholder')}
          />
        </div>

        <Button type="submit" size="lg" fullWidth disabled={loading}>
          {loading ? t('onboarding.saving') : t('onboarding.complete')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        {t('alreadyHaveAccount')}{' '}
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  )
}
