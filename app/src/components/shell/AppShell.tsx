/**
 * AppShell - the frame around every /dashboard page.
 *
 * LAYOUT
 *   < lg  : sticky 56px header (z-40, safe-area aware: workspace switcher, timer chip, notifications with
 *           unread badge, avatar -> account sheet with theme / language / settings / log out) + fixed bottom
 *           tab bar (z-30: Home, Projects, Notes, People, More -> bottom sheet with Tasks, Plan, Time, Focus,
 *           Finance, Reports, Webhooks, Workspaces, Settings). The tab bar hides while the on-screen keyboard
 *           is open.
 *   >= lg : persistent left sidebar (collapsible to an icon rail, remembered in localStorage
 *           under "trackwork-sidebar") with the primary nav, tools, workspace switcher and
 *           account. The header becomes a slim 56px bar: breadcrumb + New / theme / language /
 *           notifications. Dialogs stay at z-[80], sheets z-[70], header z-40, sidebar z-[41] (so its
 *           dropdowns paint above the header), FAB / bottom bar z-30.
 *
 * MOBILE METRICS (globals.css): --bottom-nav-h = tab bar height incl. home-indicator inset (0 at lg+),
 *   --fab-h = space taken by the FAB while one is visible (set here), --app-header-h = sticky header height.
 *   <main> already pads its bottom by --bottom-nav-h + --fab-h, so NO page needs its own bottom padding to
 *   clear the tab bar. Custom fixed bottom bars: use the `bottom-nav` class (bottom: var(--bottom-nav-h)).
 *
 * FAB CONVENTION (phone, < sm only; a floating "+" above the tab bar, thumb reachable)
 *   - The shell owns the one FAB; pages must never render their own floating button.
 *   - It shows only on the routes listed in FAB_ROUTES below (exact path match): Home and Tasks create a
 *     task, Projects creates a project - the same create dialogs as the header "New" menu (onCreate).
 *   - Pages with their own primary action in the page body (Notes, Plan, Time, Money, Team, detail pages,
 *     forms) are simply not listed; to opt a new page in, add its path to FAB_ROUTES. The FAB is hidden
 *     while the keyboard is open. Because the page header on a FAB route also has a "+" button, page
 *     authors may hide that one below sm (`hidden sm:inline-flex`) to avoid two buttons for one action.
 *
 * CONTENT CONTAINER CONVENTION (for page authors)
 *   - The shell already provides the page gutter (px-4 sm:px-6 lg:px-8, plus landscape safe-area insets)
 *     and centres the page in a `max-w-[1680px]` column. Pages should NOT add their own page-level
 *     max-w / mx-auto / horizontal padding; just fill the width (use grids such as `xl:grid-cols-12`,
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
import dynamic from 'next/dynamic'
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
  Monitor,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sun,
  Target,
  Timer,
  Users,
  Wallet,
  Webhook,
  type LucideIcon,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Kbd } from '@/components/ui/Kbd'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import WorkspaceSwitcher from '@/components/layout/WorkspaceSwitcher'
import { useLocaleSwitch } from '@/i18n/LocaleProvider'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import { supabase } from '@/lib/supabase'
import { getMyProfile, getSessionUser } from '@/lib/auth-client'
import { useThemeStore } from '@/stores/useThemeStore'
import { useTimerStore } from '@/stores/useTimerStore'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import LanguageSwitch from './LanguageSwitch'
import NewMenu, { type CreateKind } from './NewMenu'
import ThemeSwitch from './ThemeSwitch'

// The notification panel is only needed after the first tap on the bell: keep it out of the first load.
const NotificationCenter = dynamic(() => import('@/components/notifications/NotificationCenter'), { ssr: false })

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

// Phone bottom tab bar: four destinations + "More".
const PHONE_TAB_KEYS: NavKey[] = ['home', 'projects', 'notes', 'people']
const phoneTabs: NavItem[] = PHONE_TAB_KEYS.map((key) => mainItems.find((item) => item.key === key) as NavItem)

// Phone "More" sheet: everything that is not a bottom tab (3 x 3 grid).
const phoneMoreItems: NavItem[] = [
  ...mainItems.filter((item) => !PHONE_TAB_KEYS.includes(item.key)),
  ...toolItems,
  ...manageItems,
]

const allItems: NavItem[] = [...mainItems, ...toolItems, ...manageItems]

// Pages that get the phone floating "+" (see FAB CONVENTION above). Exact paths.
const FAB_ROUTES: Record<string, 'task' | 'project'> = {
  '/dashboard': 'task',
  '/dashboard/tasks': 'task',
  '/dashboard/projects': 'project',
}

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
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, ref, close])
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

const tabBase = `group relative flex min-w-0 flex-1 select-none flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium leading-none ${focusRing}`

function TabFace({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  return (
    <>
      <span
        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors group-active:bg-surface-hover ${
          active ? 'bg-primary/10 text-primary' : 'text-text-secondary'
        }`}
      >
        <Icon className="h-[22px] w-[22px] shrink-0" />
      </span>
      <span className={`max-w-full truncate px-0.5 ${active ? 'text-primary' : 'text-text-secondary'}`}>{label}</span>
    </>
  )
}

function BarLink({ item }: { item: NavItem }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const active = isActive(pathname, item.href)
  return (
    <Link href={item.href} aria-current={active ? 'page' : undefined} className={tabBase}>
      <TabFace icon={item.icon} label={t(item.key)} active={active} />
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

/** Phone "More" tab: opens a bottom sheet with a 3-column grid of everything that is not a tab. */
function MoreTab() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const active = open || phoneMoreItems.some((item) => isActive(pathname, item.href))

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={tabBase}
      >
        <TabFace icon={MoreHorizontal} label={t('more')} active={active} />
      </button>
      <BottomSheet open={open} onClose={close} label={t('more')} title={t('more')}>
        <ul className="grid grid-cols-3 gap-2 pb-1">
          {phoneMoreItems.map(({ href, key, icon: Icon }) => {
            const itemActive = isActive(pathname, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={itemActive ? 'page' : undefined}
                  onClick={close}
                  className={`flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl px-1.5 py-3 text-center text-[13px] font-medium leading-tight active:bg-surface-hover ${focusRing} ${
                    itemActive ? 'bg-primary/10 text-primary' : 'text-text-primary'
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      itemActive ? 'bg-primary/15 text-primary' : 'bg-tertiary text-text-secondary'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="line-clamp-2 max-w-full break-words">{t(key)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </BottomSheet>
    </>
  )
}

const themeOptions: { value: 'light' | 'dark' | 'system'; icon: LucideIcon }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
]

/** Phone account sheet body: theme, language, settings, log out. */
function AccountSheetBody({ onLogout, close }: { onLogout: () => void; close: () => void }) {
  const tNav = useTranslations('nav')
  const tShell = useTranslations('shell')
  const tTheme = useTranslations('theme')
  const { theme, setTheme } = useThemeStore()
  const { locale, setLocale } = useLocaleSwitch()
  const rowClass = `flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base active:bg-surface-hover ${focusRing}`

  return (
    <div className="space-y-4 pt-1">
      <div className="space-y-1.5">
        <p className="px-1 text-xs font-medium text-text-muted">{tShell('theme')}</p>
        <SegmentedControl
          fullWidth
          ariaLabel={tShell('theme')}
          value={theme}
          onChange={setTheme}
          options={themeOptions.map(({ value, icon: Icon }) => ({
            value,
            label: tTheme(value),
            icon: <Icon aria-hidden />,
          }))}
        />
      </div>
      <div className="space-y-1.5">
        <p className="px-1 text-xs font-medium text-text-muted">{tShell('language')}</p>
        <SegmentedControl
          fullWidth
          ariaLabel={tShell('language')}
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'en', label: 'English' },
            { value: 'mk', label: 'Македонски' },
          ]}
        />
      </div>
      <div className="border-t border-border pt-2">
        <Link href="/dashboard/settings" onClick={close} className={`${rowClass} text-text-primary`}>
          <Settings className="h-5 w-5 text-text-muted" />
          {tNav('settings')}
        </Link>
        <button type="button" onClick={onLogout} className={`${rowClass} text-danger`}>
          <LogOut className="h-5 w-5" />
          {tShell('logout')}
        </button>
      </div>
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
  const side = placement === 'side'

  useDismiss(open && side, ref, close)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    let active = true
    const load = async () => {
      // Local session (no network) + one shared profile lookup: the shell renders this menu twice
      // (header + sidebar) and each copy used to ask Supabase Auth and the profiles table on its own.
      const user = await getSessionUser()
      if (!active || !user) return
      const metaName = typeof user.user_metadata?.username === 'string' ? user.user_metadata.username : ''
      if (active) setUsername(metaName || user.email || '')
      const data = await getMyProfile()
      if (!active || !data) return
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
            : `inline-flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-hover ${focusRing}`
        }
        aria-expanded={open}
        aria-haspopup={side ? 'menu' : 'dialog'}
        aria-label={name}
        title={collapsed ? name : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar src={avatarUrl} alt={name} fallback={name.slice(0, 2).toUpperCase()} size="sm" className="h-8 w-8 text-[11px]" />
        {side && !collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{name}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-muted" />
          </>
        )}
      </button>
      {side ? (
        open && (
          <div
            role="menu"
            className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border border-border bg-surface p-1 shadow-lg"
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
        )
      ) : (
        <BottomSheet open={open} onClose={close} label={name}>
          <div className="flex items-center gap-3 pb-3">
            <Avatar src={avatarUrl} alt={name} fallback={name.slice(0, 2).toUpperCase()} size="lg" />
            <p className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">{name}</p>
          </div>
          <AccountSheetBody onLogout={logout} close={close} />
        </BottomSheet>
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

function formatClock(seconds: number, compact = false) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const parts = compact && hours === 0 ? [minutes, secs] : [hours, minutes, secs]
  return parts.map((part) => String(part).padStart(2, '0')).join(':')
}

export default function AppShell({ children, onCreate }: { children: ReactNode; onCreate: (kind: CreateKind) => void }) {
  const tNav = useTranslations('nav')
  const tShell = useTranslations('shell')
  const tSearch = useTranslations('search')
  const openSearch = useCallback(() => window.dispatchEvent(new Event('trackwork:open-search')), [])
  const pathname = usePathname()
  const { currentWorkspace } = useWorkspaceStore()
  const { time, isRunning, stop, tick } = useTimerStore()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [unread, setUnread] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isPhone = useMediaQuery('(max-width: 639px)')
  const keyboard = useVisualViewport()
  const keyboardOpen = Boolean(keyboard) && isTypingTarget(typeof document === 'undefined' ? null : document.activeElement)

  const fabKind = pathname ? FAB_ROUTES[pathname.replace(/\/$/, '') || '/'] : undefined
  const showFab = Boolean(fabKind) && isPhone && !keyboardOpen

  // Tell the CSS how much room the FAB takes (toasts + <main> padding read --fab-h).
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--fab-h', showFab ? '4.5rem' : '0px')
    return () => {
      root.style.removeProperty('--fab-h')
    }
  }, [showFab])

  const refreshUnread = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?unread_only=true&limit=50')
      if (!response.ok) return
      const data = await response.json()
      setUnread(Array.isArray(data.notifications) ? data.notifications.length : 0)
    } catch {
      // the badge is a nicety; stay silent offline
    }
  }, [])

  useEffect(() => {
    refreshUnread()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUnread()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshUnread])

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

  const openNotifications = () => {
    setNotificationsLoaded(true)
    setNotificationsOpen(true)
  }

  const closeNotifications = () => {
    setNotificationsOpen(false)
    refreshUnread()
  }

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose
  const bellLabel = unread > 0 ? `${tShell('notifications')}, ${tShell('unreadCount', { count: unread })}` : tShell('notifications')

  return (
    <div className="flex min-h-dvh min-w-0 overflow-x-clip bg-background text-text-primary [--app-header-h:calc(3.5rem_+_env(safe-area-inset-top,0px)_+_1px)] lg:[--app-header-h:3.5rem]">
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
        <header className="pl-safe pr-safe sticky top-0 z-40 border-b border-border bg-surface pt-[env(safe-area-inset-top)] lg:pt-0">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-4 lg:px-8">
            <Link
              href="/dashboard"
              aria-label="TrackWork"
              className={`inline-flex h-10 shrink-0 items-center rounded-lg lg:hidden ${focusRing}`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white sm:hidden">T</span>
              <span className="hidden text-base font-semibold tracking-tight text-text-primary sm:inline">
                Track<span className="text-primary">Work</span>
              </span>
            </Link>
            <div className="min-w-0 flex-1 sm:w-[240px] sm:flex-none lg:hidden">
              <WorkspaceSwitcher />
            </div>
            <Breadcrumb mounted={mounted} />
            {isRunning ? (
              <button
                type="button"
                onClick={() => stop()}
                aria-label={`${tShell('stopTimer')} ${formatClock(time)}`}
                title={tShell('stopTimer')}
                className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-xs font-medium tabular-nums text-primary active:bg-primary/20 ${focusRing}`}
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                <span className="sm:hidden">{formatClock(time, true)}</span>
                <span className="hidden sm:inline">{formatClock(time)}</span>
              </button>
            ) : null}
            <div className="ml-auto flex shrink-0 items-center gap-0.5 lg:gap-1">
              <button
                type="button"
                onClick={openSearch}
                aria-label={tSearch('open')}
                className={`hidden h-9 w-56 items-center gap-2 rounded-xl border border-border-control bg-background px-3 text-sm text-text-muted hover:bg-surface-hover xl:w-72 lg:flex ${focusRing}`}
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-left">{tSearch('buttonPlaceholder')}</span>
                <span className="hidden items-center gap-0.5 xl:flex" aria-hidden>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>K</Kbd>
                </span>
              </button>
              <button
                type="button"
                onClick={openSearch}
                aria-label={tSearch('open')}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-hover active:bg-surface-hover lg:hidden ${focusRing}`}
              >
                <Search className="h-5 w-5" />
              </button>
              <div className="hidden sm:block">
                <NewMenu onCreate={onCreate} />
              </div>
              <div className="hidden lg:contents">
                <ThemeSwitch />
                <LanguageSwitch />
              </div>
              <button
                type="button"
                className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-hover active:bg-surface-hover ${focusRing}`}
                aria-expanded={notificationsOpen}
                aria-haspopup="dialog"
                aria-label={bellLabel}
                onClick={openNotifications}
              >
                <Bell className="h-5 w-5" />
                {unread > 0 ? (
                  <span
                    aria-hidden
                    className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none tabular-nums text-white ring-2 ring-surface"
                  >
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </button>
              <div className="lg:hidden">
                <AccountMenu placement="top" />
              </div>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 pb-[calc(var(--bottom-nav-h)_+_var(--fab-h,0px)_+_1.5rem)] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-5 focus:outline-none sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] lg:px-8 lg:pb-8 lg:pt-6"
        >
          <div className="mx-auto w-full min-w-0 max-w-[1680px]">{children}</div>
        </main>

        {showFab && fabKind ? (
          <button
            type="button"
            onClick={() => onCreate(fabKind)}
            aria-label={fabKind === 'task' ? tShell('newTask') : tShell('newProject')}
            className={`fixed bottom-[calc(var(--bottom-nav-h)_+_1rem)] right-[max(1rem,env(safe-area-inset-right))] z-30 flex h-14 w-14 animate-pop-in select-none items-center justify-center rounded-2xl bg-primary text-white shadow-lg transition-transform active:scale-95 active:bg-primary-active ${focusRing} focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
          >
            <Plus className="h-6 w-6" />
          </button>
        ) : null}

        <nav
          aria-label={tShell('mainNav')}
          className={`pl-safe pr-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden ${
            keyboardOpen ? 'hidden' : ''
          }`}
        >
          <div className="mx-auto flex h-14 max-w-2xl items-stretch gap-0.5 px-1">
            {phoneTabs.map((item) => (
              <BarLink key={item.href} item={item} />
            ))}
            <MoreTab />
          </div>
        </nav>
      </div>

      {notificationsLoaded ? (
        <NotificationCenter
          isOpen={notificationsOpen}
          onClose={closeNotifications}
          workspaceId={currentWorkspace?.id || ''}
        />
      ) : null}
    </div>
  )
}
