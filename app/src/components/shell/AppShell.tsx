/**
 * AppShell - the frame around every /dashboard page.
 *
 * LAYOUT
 *   < lg  : sticky header (z-40) + fixed bottom tab bar (z-30). "More" lives in the header.
 *   >= lg : persistent left sidebar (collapsible to an icon rail, remembered in localStorage
 *           under "trackwork-sidebar") with the primary nav, tools, workspace switcher and
 *           account. The header becomes a slim 56px bar: breadcrumb + New / theme / language /
 *           notifications. Dialogs stay at z-[80], header z-40, sidebar z-[41] (so its
 *           dropdowns paint above the header), bottom bar z-30.
 *
 * CONTENT CONTAINER CONVENTION (for page authors)
 *   - The shell already provides the page gutter (px-4 sm:px-6 lg:px-8) and centres the page in
 *     a `max-w-[1680px]` column. Pages should NOT add their own page-level max-w / mx-auto /
 *     horizontal padding; just fill the width (use grids such as `xl:grid-cols-12`,
 *     `2xl:grid-cols-4`). Forms / reading pages may narrow themselves with e.g. `max-w-3xl`.
 *   - Full-height app-style pages (boards, calendars, split panes): wrap the page in
 *     `<PageFill>` from '@/components/shell/PageFill'. At lg+ it is exactly as tall as the
 *     viewport minus the header and page padding (so the document does not scroll twice) and
 *     children should use `min-h-0` + `overflow-auto` for inner scrolling. Below lg it is a
 *     normal flow block. `<PageFill bleed>` also cancels the page gutter for edge-to-edge UIs.
 *   - Never use `overflow-x-hidden` on page wrappers (it clips dropdowns); the shell already
 *     applies `overflow-x-clip` at the root so nothing can widen the viewport.
 */
'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  BarChart3,
  Bell,
  Building2,
  CheckSquare,
  ChevronsUpDown,
  FileText,
  Focus,
  FolderKanban,
  Home,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Target,
  Timer,
  Users,
  Wallet,
  Webhook,
  type LucideIcon,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import WorkspaceSwitcher from '@/components/layout/WorkspaceSwitcher'
import NotificationCenter from '@/components/notifications/NotificationCenter'
import { supabase } from '@/lib/supabase'
import { useTimerStore } from '@/stores/useTimerStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import LanguageSwitch from './LanguageSwitch'
import NewMenu, { type CreateKind } from './NewMenu'
import ThemeSwitch from './ThemeSwitch'

type NavKey =
  | 'home'
  | 'projects'
  | 'tasks'
  | 'plan'
  | 'notes'
  | 'people'
  | 'time'
  | 'focus'
  | 'finance'
  | 'reports'
  | 'webhooks'
  | 'workspaces'
  | 'settings'

interface NavItem {
  href: string
  key: NavKey
  icon: LucideIcon
}

const SIDEBAR_STORAGE_KEY = 'trackwork-sidebar'

// Main sections, as shown in the sidebar.
const mainItems: NavItem[] = [
  { href: '/dashboard', key: 'home', icon: Home },
  { href: '/dashboard/projects', key: 'projects', icon: FolderKanban },
  { href: '/dashboard/tasks', key: 'tasks', icon: CheckSquare },
  { href: '/dashboard/plans', key: 'plan', icon: Target },
  { href: '/dashboard/notes', key: 'notes', icon: FileText },
  { href: '/dashboard/team', key: 'people', icon: Users },
]

// Phone bottom tab bar keeps the original five tabs (Tasks is reachable from Home and "More").
const phoneTabs: NavItem[] = mainItems.filter((item) => item.key !== 'tasks')

const toolItems: NavItem[] = [
  { href: '/dashboard/time-tracker', key: 'time', icon: Timer },
  { href: '/dashboard/focus', key: 'focus', icon: Focus },
  { href: '/dashboard/finance', key: 'finance', icon: Wallet },
  { href: '/dashboard/reports', key: 'reports', icon: BarChart3 },
]

const manageItems: NavItem[] = [
  { href: '/dashboard/settings/webhooks', key: 'webhooks', icon: Webhook },
  { href: '/dashboard/workspaces', key: 'workspaces', icon: Building2 },
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
]

// Phone "More" menu: everything that is not a bottom tab.
const phoneMoreItems: NavItem[] = [
  mainItems.find((item) => item.key === 'tasks') as NavItem,
  ...toolItems,
  ...manageItems,
]

const allItems: NavItem[] = [...mainItems, ...toolItems, ...manageItems]

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/dashboard' || href === '/dashboard/settings') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function sectionFor(pathname: string | null) {
  if (!pathname) return null
  if (pathname.startsWith('/dashboard/workspace/')) return allItems.find((item) => item.key === 'workspaces') ?? null
  const matches = allItems.filter((item) => isActive(pathname, item.href))
  matches.sort((a, b) => b.href.length - a.href.length)
  return matches[0] ?? null
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

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

function BarLink({ item }: { item: NavItem }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const active = isActive(pathname, item.href)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] leading-tight ${focusRing} ${
        active ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-hover'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="max-w-full truncate">{t(item.key)}</span>
    </Link>
  )
}

function SideLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const active = isActive(pathname, item.href)
  const Icon = item.icon
  const label = t(item.key)
  return (
    <Link
      href={item.href}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`relative flex h-9 items-center rounded-lg text-sm font-medium transition-colors ${focusRing} ${
        collapsed ? 'justify-center' : 'gap-3 px-3'
      } ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
      }`}
    >
      {active && <span aria-hidden className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className={collapsed ? 'sr-only' : 'truncate'}>{label}</span>
    </Link>
  )
}

function SideGroup({ label, items, collapsed }: { label?: string; items: NavItem[]; collapsed: boolean }) {
  return (
    <div className="space-y-0.5">
      {label &&
        (collapsed ? (
          <div aria-hidden className="mx-3 mb-2 mt-1 border-t border-border" />
        ) : (
          <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</p>
        ))}
      {items.map((item) => (
        <SideLink key={item.href} item={item} collapsed={collapsed} />
      ))}
    </div>
  )
}

function MoreMenu() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const active = phoneMoreItems.some((item) => isActive(pathname, item.href))

  useDismiss(open, ref, close)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`inline-flex h-9 items-center gap-2 rounded-xl px-2 text-sm ${focusRing} ${
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
        <div role="menu" className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-border bg-surface p-1 shadow-lg">
          {phoneMoreItems.map(({ href, key, icon: Icon }) => {
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

function AccountMenu({ placement, collapsed = false }: { placement: 'top' | 'side'; collapsed?: boolean }) {
  const tNav = useTranslations('nav')
  const tShell = useTranslations('shell')
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
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
      const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
      if (!active) return
      if (data?.username) setUsername(data.username)
      if (data?.avatar_url) setAvatarUrl(data.avatar_url)
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

  const side = placement === 'side'
  const name = username || tShell('account')

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={
          side
            ? `flex h-11 w-full items-center rounded-lg text-left text-sm text-text-secondary hover:bg-surface-hover ${focusRing} ${
                collapsed ? 'justify-center' : 'gap-2.5 px-2'
              }`
            : `inline-flex h-9 max-w-[9rem] items-center gap-2 rounded-xl px-2 text-sm text-text-secondary hover:bg-surface-hover ${focusRing}`
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={name}
        title={collapsed ? name : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar src={avatarUrl} alt={name} fallback={name.slice(0, 2).toUpperCase()} size="sm" className="h-7 w-7 text-[11px]" />
        {side ? (
          !collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{name}</span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-muted" />
            </>
          )
        ) : (
          username && <span className="hidden truncate sm:inline">{username}</span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-50 w-56 rounded-xl border border-border bg-surface p-1 shadow-lg ${
            side ? 'bottom-full left-0 mb-2' : 'right-0 mt-2'
          }`}
        >
          <div className="truncate px-3 py-2 text-sm font-medium text-text-primary">{name}</div>
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

function Breadcrumb({ mounted }: { mounted: boolean }) {
  const tNav = useTranslations('nav')
  const pathname = usePathname()
  const { currentWorkspace } = useWorkspaceStore()
  const section = sectionFor(pathname)
  if (!section) return null
  const nested = pathname !== section.href
  const label = tNav(section.key)
  return (
    <div className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
      {mounted && currentWorkspace?.name && (
        <>
          <span className="max-w-[14rem] truncate text-text-muted">{currentWorkspace.name}</span>
          <span aria-hidden className="text-text-muted">/</span>
        </>
      )}
      {nested ? (
        <Link href={section.href} className={`truncate rounded font-semibold text-text-primary hover:text-primary ${focusRing}`}>
          {label}
        </Link>
      ) : (
        <span className="truncate font-semibold text-text-primary" aria-current="page">
          {label}
        </span>
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
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    } catch {
      stored = null
    }
    if (stored === 'collapsed') setCollapsed(true)
    else if (stored === null && window.innerWidth < 1280) setCollapsed(true)
    setMounted(true)
  }, [])

  const toggleSidebar = () => {
    setCollapsed((value) => {
      const next = !value
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'collapsed' : 'expanded')
      } catch {
        // storage unavailable: the preference simply is not remembered
      }
      return next
    })
  }

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

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <div className="flex min-h-dvh min-w-0 overflow-x-clip bg-background text-text-primary [--app-header-h:101px] sm:[--app-header-h:57px] lg:[--app-header-h:3.5rem]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-lg focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-text-primary focus:shadow-lg"
      >
        {tShell('skipToContent')}
      </a>

      {/* Desktop sidebar */}
      <aside
        aria-label={tShell('mainNav')}
        className={`sticky top-0 z-[41] hidden h-dvh shrink-0 flex-col border-r border-border bg-surface lg:flex ${
          mounted ? 'transition-[width] duration-200 motion-reduce:transition-none' : ''
        } ${collapsed ? 'w-[68px]' : 'w-60'}`}
      >
        <div className={`flex h-14 shrink-0 items-center border-b border-border ${collapsed ? 'justify-center' : 'px-4'}`}>
          <Link
            href="/dashboard"
            aria-label="TrackWork"
            className={`rounded-lg text-base font-semibold tracking-tight text-text-primary ${focusRing}`}
          >
            {collapsed ? (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">T</span>
            ) : (
              <>
                Track<span className="text-primary">Work</span>
              </>
            )}
          </Link>
        </div>

        <div className={`shrink-0 pt-3 ${collapsed ? 'flex justify-center' : 'px-3'}`}>
          <WorkspaceSwitcher compact={collapsed} />
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-3" aria-label={tShell('mainNav')}>
          <SideGroup items={mainItems} collapsed={collapsed} />
          <SideGroup label={tNav('groupTools')} items={toolItems} collapsed={collapsed} />
          <SideGroup label={tNav('groupManage')} items={manageItems} collapsed={collapsed} />
        </nav>

        <div className="shrink-0 space-y-1 border-t border-border p-3">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? tShell('expandSidebar') : tShell('collapseSidebar')}
            title={collapsed ? tShell('expandSidebar') : tShell('collapseSidebar')}
            className={`flex h-9 w-full items-center rounded-lg text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary ${focusRing} ${
              collapsed ? 'justify-center' : 'gap-3 px-3'
            }`}
          >
            <ToggleIcon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="truncate">{tShell('collapseSidebar')}</span>}
          </button>
          <AccountMenu placement="side" collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-surface">
          <div className="flex items-center gap-2 px-3 py-2 sm:px-4 lg:h-14 lg:px-8 lg:py-0">
            <Link
              href="/dashboard"
              className="shrink-0 text-sm font-semibold tracking-tight text-text-primary sm:text-base lg:hidden"
            >
              Track<span className="text-primary">Work</span>
            </Link>
            <div className="hidden min-w-0 sm:block sm:w-[240px] lg:hidden">
              <WorkspaceSwitcher />
            </div>
            <Breadcrumb mounted={mounted} />
            {isRunning ? (
              <button
                type="button"
                onClick={() => stop()}
                aria-label={`${tShell('stopTimer')} ${formatClock(time)}`}
                title={tShell('stopTimer')}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 text-xs font-medium tabular-nums text-primary ${focusRing}`}
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                {formatClock(time)}
              </button>
            ) : null}
            <div className="ml-auto flex shrink-0 items-center gap-0.5 lg:gap-1">
              <div className="lg:hidden">
                <MoreMenu />
              </div>
              <NewMenu onCreate={onCreate} />
              <div className="hidden sm:contents">
                <ThemeSwitch />
                <LanguageSwitch />
              </div>
              <button
                type="button"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-hover ${focusRing}`}
                aria-expanded={notificationsOpen}
                aria-label={tShell('notifications')}
                onClick={() => setNotificationsOpen(true)}
              >
                <Bell className="h-5 w-5" />
              </button>
              <div className="lg:hidden">
                <AccountMenu placement="top" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 pb-2 sm:hidden">
            <div className="min-w-0 flex-1">
              <WorkspaceSwitcher />
            </div>
            <LanguageSwitch />
            <ThemeSwitch />
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 pb-24 pt-6 focus:outline-none sm:px-6 lg:px-8 lg:pb-8"
        >
          <div className="mx-auto w-full min-w-0 max-w-[1680px]">{children}</div>
        </main>

        <nav
          aria-label={tShell('mainNav')}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
        >
          <div className="flex items-stretch">
            {phoneTabs.map((item) => (
              <BarLink key={item.href} item={item} />
            ))}
          </div>
        </nav>
      </div>

      <NotificationCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        workspaceId={currentWorkspace?.id || ''}
      />
    </div>
  )
}
