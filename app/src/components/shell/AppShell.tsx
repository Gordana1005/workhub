'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  BarChart3,
  Bell,
  Building2,
  FileText,
  Focus,
  FolderKanban,
  Home,
  LogOut,
  MoreHorizontal,
  Settings,
  Target,
  Timer,
  User,
  Users,
  Wallet,
  Webhook,
  type LucideIcon,
} from 'lucide-react'
import WorkspaceSwitcher from '@/components/layout/WorkspaceSwitcher'
import NotificationCenter from '@/components/notifications/NotificationCenter'
import { supabase } from '@/lib/supabase'
import { useTimerStore } from '@/stores/useTimerStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import LanguageSwitch from './LanguageSwitch'
import NewMenu, { type CreateKind } from './NewMenu'
import ThemeSwitch from './ThemeSwitch'

const primaryItems: { href: string; key: 'home' | 'work' | 'plan' | 'notes' | 'people'; icon: LucideIcon }[] = [
  { href: '/dashboard', key: 'home', icon: Home },
  { href: '/dashboard/projects', key: 'work', icon: FolderKanban },
  { href: '/dashboard/plans', key: 'plan', icon: Target },
  { href: '/dashboard/notes', key: 'notes', icon: FileText },
  { href: '/dashboard/team', key: 'people', icon: Users },
]

const moreItems: {
  href: string
  key: 'time' | 'focus' | 'money' | 'reports' | 'webhooks' | 'workspaces' | 'settings'
  icon: LucideIcon
}[] = [
  { href: '/dashboard/time-tracker', key: 'time', icon: Timer },
  { href: '/dashboard/focus', key: 'focus', icon: Focus },
  { href: '/dashboard/finance', key: 'money', icon: Wallet },
  { href: '/dashboard/reports', key: 'reports', icon: BarChart3 },
  { href: '/dashboard/settings/webhooks', key: 'webhooks', icon: Webhook },
  { href: '/dashboard/workspaces', key: 'workspaces', icon: Building2 },
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
]

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/dashboard' || href === '/dashboard/settings') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function useDismiss(open: boolean, ref: { current: HTMLElement | null }, close: () => void) {
  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, ref, close])
}

function ShellLink({
  href,
  label,
  icon: Icon,
  variant,
}: {
  href: string
  label: string
  icon: LucideIcon
  variant: 'row' | 'bar'
}) {
  const pathname = usePathname()
  const active = isActive(pathname, href)
  const className =
    variant === 'row'
      ? `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
          active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-hover'
        }`
      : `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] leading-tight ${
          active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-hover'
        }`

  return (
    <Link href={href} className={className} aria-current={active ? 'page' : undefined}>
      <Icon className={variant === 'row' ? 'h-4 w-4 shrink-0' : 'h-5 w-5 shrink-0'} />
      <span className="truncate">{label}</span>
    </Link>
  )
}

function MoreMenu({ align }: { align: 'left' | 'right' }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const active = moreItems.some((item) => isActive(pathname, item.href))

  useDismiss(open, ref, close)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`inline-flex h-9 items-center gap-2 rounded-xl px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-hover'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('more')}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-5 w-5" />
        <span className="hidden sm:inline">{t('more')}</span>
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-2 w-52 rounded-xl border border-border bg-surface p-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {moreItems.map(({ href, key, icon: Icon }) => {
            const itemActive = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                aria-current={itemActive ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  itemActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-hover'
                }`}
                onClick={close}
              >
                <Icon className="h-4 w-4" />
                {t(key)}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AccountMenu() {
  const tNav = useTranslations('nav')
  const tShell = useTranslations('shell')
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])

  useDismiss(open, ref, close)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    let active = true
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active || !user) return
      const metaName = typeof user.user_metadata?.username === 'string' ? user.user_metadata.username : ''
      if (active) setUsername(metaName || user.email || '')
      const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      if (active && data?.username) setUsername(data.username)
    }
    load().catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const logout = async () => {
    close()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex h-9 max-w-[9rem] items-center gap-2 rounded-xl px-2 text-sm text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={username || tShell('account')}
        onClick={() => setOpen((value) => !value)}
      >
        <User className="h-4 w-4 shrink-0" />
        {username && <span className="hidden truncate sm:inline">{username}</span>}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          <div className="truncate px-3 py-2 text-sm text-text-primary">{username || tShell('account')}</div>
          <Link
            href="/dashboard/settings"
            role="menuitem"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover"
            onClick={close}
          >
            <Settings className="h-4 w-4" />
            {tNav('settings')}
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-text-secondary hover:bg-surface-hover"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            {tShell('logout')}
          </button>
        </div>
      )}
    </div>
  )
}

function formatClock(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hours, minutes, secs].map((part) => String(part).padStart(2, '0')).join(':')
}

export default function AppShell({ children, onCreate }: { children: ReactNode; onCreate: (kind: CreateKind) => void }) {
  const tNav = useTranslations('nav')
  const tShell = useTranslations('shell')
  const { currentWorkspace } = useWorkspaceStore()
  const { time, isRunning, stop, tick } = useTimerStore()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isRunning, tick])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (event.key !== 'n' && event.key !== 'N') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      onCreate('task')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCreate])

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-background text-text-primary">
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
          <Link href="/dashboard" className="shrink-0 text-sm font-semibold tracking-tight text-text-primary sm:text-base">
            Track<span className="text-primary">Work</span>
          </Link>
          <div className="hidden min-w-0 sm:block sm:w-[240px]">
            <WorkspaceSwitcher />
          </div>
          {isRunning ? (
            <button
              type="button"
              onClick={() => stop()}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary"
            >
              <span className="h-2 w-2 rounded-full bg-primary" />
              {formatClock(time)}
            </button>
          ) : null}
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <div className="lg:hidden">
              <MoreMenu align="right" />
            </div>
            <NewMenu onCreate={onCreate} />
            <div className="hidden sm:contents">
              <ThemeSwitch />
              <LanguageSwitch />
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-expanded={notificationsOpen}
              aria-label={tShell('notifications')}
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="h-5 w-5" />
            </button>
            <AccountMenu />
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 pb-2 sm:hidden">
          <div className="min-w-0 flex-1">
            <WorkspaceSwitcher />
          </div>
          <LanguageSwitch />
          <ThemeSwitch />
        </div>
        <nav className="hidden items-center gap-1 border-t border-border px-3 py-2 lg:flex sm:px-4">
          {primaryItems.map((item) => (
            <ShellLink key={item.href} href={item.href} label={tNav(item.key)} icon={item.icon} variant="row" />
          ))}
          <MoreMenu align="left" />
        </nav>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-hidden px-4 pt-6 pb-24 lg:pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-stretch">
          {primaryItems.map((item) => (
            <ShellLink key={item.href} href={item.href} label={tNav(item.key)} icon={item.icon} variant="bar" />
          ))}
        </div>
      </nav>

      <NotificationCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        workspaceId={currentWorkspace?.id || ''}
      />
    </div>
  )
}
