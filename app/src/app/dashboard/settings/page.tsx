/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Bell,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Languages,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Sun,
  User,
  Users,
  Webhook,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { supabase } from '@/lib/supabase'
import { useLocaleSwitch, type AppLocale } from '@/i18n/LocaleProvider'
import { useThemeStore, type ThemeChoice } from '@/stores/useThemeStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

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
type SectionId = 'profile' | 'appearance' | 'language' | 'notifications' | 'workspace' | 'account'

const SECTIONS: { id: SectionId; icon: LucideIcon; label: string; help: string }[] = [
  { id: 'profile', icon: User, label: 'navProfile', help: 'profileHelp' },
  { id: 'appearance', icon: Palette, label: 'navAppearance', help: 'appearanceHelp' },
  { id: 'language', icon: Languages, label: 'navLanguage', help: 'languageHelp' },
  { id: 'notifications', icon: Bell, label: 'navNotifications', help: 'notificationsHelp' },
  { id: 'workspace', icon: Building2, label: 'navWorkspace', help: 'workspaceHelp' },
  { id: 'account', icon: LogOut, label: 'navAccount', help: 'accountHelp' },
]

const fieldClass =
  'mt-1.5 block w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'

const THEMES: { id: ThemeChoice; icon: LucideIcon }[] = [
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
  { id: 'system', icon: Monitor },
]

const LANGUAGES: { id: AppLocale; name: string; hint: string }[] = [
  { id: 'en', name: 'English', hint: 'EN' },
  { id: 'mk', name: 'Македонски', hint: 'МК' },
]

function ChoiceCard({
  selected,
  onSelect,
  children,
}: {
  selected: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`relative flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:bg-surface-hover'
      }`}
    >
      {children}
      {selected ? <Check className="ml-auto h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
    </button>
  )
}

export default function SettingsPage() {
  const t = useTranslations('pages.tools')
  const tTheme = useTranslations('theme')
  const tShell = useTranslations('shell')
  const router = useRouter()
  const { locale, setLocale } = useLocaleSwitch()
  const { theme, setTheme } = useThemeStore()
  const { currentWorkspace } = useWorkspaceStore()

  // null = the section list (phone). At lg+ the list is always visible and "profile" is the default pane.
  const [section, setSection] = useState<SectionId | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')

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
          router.push('/auth/login')
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

  useEffect(() => {
    setNotifPermission('Notification' in window ? Notification.permission : 'unsupported')
  }, [])

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

  const requestNotifications = useCallback(async () => {
    if (!('Notification' in window)) return
    setNotifPermission(await Notification.requestPermission())
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const active = SECTIONS.find((item) => item.id === (section ?? 'profile')) as (typeof SECTIONS)[number]

  const profileForm = loading ? (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  ) : (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSave()
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-surface-hover">
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
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAvatarSelector((open) => !open)}>
            {showAvatarSelector ? t('settings.closeSelection') : t('settings.chooseAvatar')}
          </Button>
        </div>
      </div>

      {showAvatarSelector ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {AVATAR_OPTIONS.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => {
                setProfile({ ...profile, avatar_url: url })
                setShowAvatarSelector(false)
              }}
              aria-pressed={profile.avatar_url === url}
              className={`aspect-square overflow-hidden rounded-xl border-2 bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                profile.avatar_url === url ? 'border-primary' : 'border-transparent hover:border-border'
              }`}
            >
              <img src={url} alt={t('settings.avatarAlt', { index: index + 1 })} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block text-sm text-text-secondary">
          {t('settings.username')}
          <input
            type="text"
            value={profile.username}
            onChange={(event) => setProfile({ ...profile, username: event.target.value })}
            className={fieldClass}
            placeholder={t('settings.usernamePlaceholder')}
          />
        </label>
        <label className="block text-sm text-text-secondary">
          {t('settings.email')}
          <input
            type="email"
            value={profile.email}
            readOnly
            className={`${fieldClass} cursor-not-allowed text-text-secondary`}
            title={t('settings.emailLocked')}
          />
        </label>
        <label className="block text-sm text-text-secondary">
          {t('settings.jobTitle')}
          <input
            type="text"
            value={profile.job_title}
            onChange={(event) => setProfile({ ...profile, job_title: event.target.value })}
            className={fieldClass}
            placeholder={t('settings.jobTitlePlaceholder')}
          />
        </label>
        <label className="block text-sm text-text-secondary">
          {t('settings.department')}
          <input
            type="text"
            value={profile.department}
            onChange={(event) => setProfile({ ...profile, department: event.target.value })}
            className={fieldClass}
            placeholder={t('settings.departmentPlaceholder')}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? t('settings.saving') : t('settings.saveChanges')}
        </Button>
        {message ? (
          <p role="status" className={`text-sm ${message.type === 'success' ? 'text-success' : 'text-danger'}`}>
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  )

  const notificationStatus: Record<NotificationPermission | 'unsupported', string> = {
    granted: t('settings.notifGranted'),
    denied: t('settings.notifDenied'),
    default: t('settings.notifDefault'),
    unsupported: t('settings.notifUnsupported'),
  }

  const panes: Record<SectionId, ReactNode> = {
    profile: profileForm,
    appearance: (
      <div role="radiogroup" aria-label={tShell('theme')} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {THEMES.map(({ id, icon: Icon }) => (
          <ChoiceCard key={id} selected={theme === id} onSelect={() => setTheme(id)}>
            <Icon className="h-5 w-5 shrink-0 text-text-secondary" aria-hidden="true" />
            <span className="text-sm font-medium text-text-primary">{tTheme(id)}</span>
          </ChoiceCard>
        ))}
      </div>
    ),
    language: (
      <div role="radiogroup" aria-label={tShell('language')} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LANGUAGES.map((language) => (
          <ChoiceCard key={language.id} selected={locale === language.id} onSelect={() => setLocale(language.id)}>
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-xs font-semibold text-text-secondary">
              {language.hint}
            </span>
            <span className="text-sm font-medium text-text-primary">{language.name}</span>
          </ChoiceCard>
        ))}
      </div>
    ),
    notifications: (
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{t('settings.desktopNotifications')}</p>
          <p className="mt-0.5 text-sm text-text-secondary">{t('settings.desktopHelp')}</p>
          <p className="mt-2 text-sm font-medium text-text-primary">{notificationStatus[notifPermission]}</p>
        </div>
        {notifPermission === 'default' ? (
          <Button type="button" variant="secondary" onClick={requestNotifications} className="shrink-0">
            {t('settings.enableNotifications')}
          </Button>
        ) : null}
      </div>
    ),
    workspace: currentWorkspace ? (
      <div className="space-y-4">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-text-secondary">{t('settings.currentWorkspace')}</p>
          <p className="mt-1 break-words text-base font-semibold text-text-primary">{currentWorkspace.name}</p>
          {currentWorkspace.userRole ? (
            <p className="mt-0.5 text-sm text-text-secondary">
              {currentWorkspace.userRole === 'admin' ? t('settings.roleAdmin') : t('settings.roleMember')}
            </p>
          ) : null}
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {[
            { href: '/dashboard/workspaces', icon: Building2, label: t('settings.manageWorkspaces') },
            { href: '/dashboard/team', icon: Users, label: t('settings.openTeam') },
            { href: '/dashboard/settings/webhooks', icon: Webhook, label: t('settings.openWebhooks') },
          ].map(({ href, icon: Icon, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-3 text-sm text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <Icon className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    ) : (
      <p className="text-sm text-text-secondary">{t('settings.noWorkspace')}</p>
    ),
    account: (
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{tShell('logout')}</p>
          <p className="mt-0.5 break-all text-sm text-text-secondary">
            {t('settings.signedInAs', { email: profile.email || '-' })}
          </p>
        </div>
        <Button type="button" variant="danger" onClick={signOut} className="shrink-0 gap-2">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {tShell('logout')}
        </Button>
      </div>
    ),
  }

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title={t('settings.title')} description={t('settings.subtitle')} />

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <nav aria-label={t('settings.title')} className={`${section ? 'hidden lg:block' : 'block'} lg:sticky lg:top-20`}>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface lg:space-y-0.5 lg:divide-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent">
            {SECTIONS.map(({ id, icon: Icon, label }) => {
              const selected = (section ?? 'profile') === id
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => setSection(id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:rounded-xl lg:py-2.5 ${
                      selected
                        ? 'font-medium text-text-primary lg:bg-surface-hover'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{t(`settings.${label}`)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-muted lg:hidden" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <section
          aria-labelledby="settings-pane-title"
          className={`${section ? 'block' : 'hidden lg:block'} min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6`}
        >
          <button
            type="button"
            onClick={() => setSection(null)}
            className="-ml-1 mb-3 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t('settings.title')}
          </button>
          <h2 id="settings-pane-title" className="text-lg font-semibold text-text-primary">
            {t(`settings.${active.label}`)}
          </h2>
          <p className="mb-5 mt-1 text-sm text-text-secondary">{t(`settings.${active.help}`)}</p>
          {panes[active.id]}
        </section>
      </div>
    </div>
  )
}
