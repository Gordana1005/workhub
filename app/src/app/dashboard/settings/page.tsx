/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix&backgroundColor=1e3a8a,7c3aed,581c87',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Aneka&backgroundColor=dc2626,ea580c,b91c1c',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Milo&backgroundColor=059669,0d9488,047857',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Bella&backgroundColor=7c2d12,c2410c,9a3412',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Sora&backgroundColor=6b21a8,9333ea,7c3aed',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Leo&backgroundColor=0f766e,0d9488,134e4a',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Zoe&backgroundColor=be123c,dc2626,e11d48',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Kai&backgroundColor=365314,16a34a,14532d',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Nora&backgroundColor=92400e,c2410c,a16207',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Axel&backgroundColor=1e1b4b,312e81,1e3a8a',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna&backgroundColor=7c2d12,9a3412,92400e',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Omar&backgroundColor=064e3b,065f46,047857',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Iris&backgroundColor=581c87,7c3aed,6b21a8',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Jaden&backgroundColor=7f1d1d,b91c1c,991b1b',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Ruby&backgroundColor=0c4a6e,0369a1,0284c7',
]

const fieldClass =
  'w-full max-w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export default function SettingsPage() {
  const t = useTranslations('pages.tools')
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)

  const [profile, setProfile] = useState({
    username: '',
    email: '',
    job_title: '',
    department: '',
    avatar_url: '',
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        setUserId(user.id)

        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

        if (error) throw error

        if (data) {
          setProfile({
            username: data.username || '',
            email: data.email || user.email || '',
            job_title: data.job_title || '',
            department: data.department || '',
            avatar_url: data.avatar_url || AVATAR_OPTIONS[0],
          })
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        username: profile.username,
        job_title: profile.job_title,
        department: profile.department,
        avatar_url: profile.avatar_url,
        email: profile.email,
      })

      if (error) throw error

      setMessage({ type: 'success', text: t('settings.profileUpdated') })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: t('settings.profileUpdateFailed') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} description={t('settings.subtitle')} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
        >
          <div>
            <h2 className="text-base font-semibold text-text-primary">{t('settings.profileInfo')}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t('settings.profileHelp')}</p>
          </div>

          {message ? (
            <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary" role="status">
              {message.text}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-surface">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={t('settings.profileAlt')} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary text-lg font-semibold text-white">
                  {profile.username?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-text-primary">{t('settings.profilePhoto')}</p>
              <p className="text-sm text-text-secondary">{t('settings.avatarHelp')}</p>
              <Button type="button" variant="outline" onClick={() => setShowAvatarSelector((open) => !open)}>
                {showAvatarSelector ? t('settings.closeSelection') : t('settings.chooseAvatar')}
              </Button>
            </div>
          </div>

          {showAvatarSelector ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {AVATAR_OPTIONS.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => {
                    setProfile({ ...profile, avatar_url: url })
                    setShowAvatarSelector(false)
                  }}
                  className={`aspect-square overflow-hidden rounded-xl border-2 bg-surface ${
                    profile.avatar_url === url ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt={t('settings.avatarAlt', { index: index + 1 })} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          <label className="block text-sm text-text-secondary">
            {t('settings.username')}
            <input
              type="text"
              value={profile.username}
              onChange={(event) => setProfile({ ...profile, username: event.target.value })}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('settings.usernamePlaceholder')}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('settings.email')}
            <input
              type="email"
              value={profile.email}
              readOnly
              className={`${fieldClass} mt-1.5 cursor-not-allowed text-text-secondary`}
              title={t('settings.emailLocked')}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('settings.jobTitle')}
            <input
              type="text"
              value={profile.job_title}
              onChange={(event) => setProfile({ ...profile, job_title: event.target.value })}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('settings.jobTitlePlaceholder')}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('settings.department')}
            <input
              type="text"
              value={profile.department}
              onChange={(event) => setProfile({ ...profile, department: event.target.value })}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('settings.departmentPlaceholder')}
            />
          </label>

          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? t('settings.saving') : t('settings.saveChanges')}
          </Button>
        </form>
      )}
    </div>
  )
}
