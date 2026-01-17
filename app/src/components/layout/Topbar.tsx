'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Bell, 
  Home, 
  FolderKanban, 
  CheckSquare, 
  Target, 
  BarChart3, 
  DollarSign, 
  Zap, 
  Settings, 
  LogOut,
  Webhook,
  Users,
  Timer,
  FileText,
  Building2,
  Plus
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { clsx } from 'clsx'
import NotificationCenter from '@/components/notifications/NotificationCenter'

export default function Topbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspaceStore()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [profile, setProfile] = useState<{ username: string; avatar_url?: string | null }>({ username: '', avatar_url: null })
  const [userId, setUserId] = useState<string | null>(null)
  
  // Profile dropdown state
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showDesktopMenu, setShowDesktopMenu] = useState(false)
  const [showMobileWorkspaceMenu, setShowMobileWorkspaceMenu] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
      if (showDesktopMenu && !document.querySelector('.desktop-menu')?.contains(event.target as Node)) {
        setShowDesktopMenu(false)
      }
      if (showMobileWorkspaceMenu && !document.querySelector('.mobile-workspace-menu')?.contains(event.target as Node)) {
        setShowMobileWorkspaceMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDesktopMenu, showMobileWorkspaceMenu])

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile({
          username: data.username || 'me',
          avatar_url: data.avatar_url || null
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('profile-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        fetchProfile
      )
      .subscribe()

    const handleVisibility = () => {
      if (!document.hidden) fetchProfile()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchProfile, userId])

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?unread_only=true')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.notifications?.length || 0)
      }
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }, [])

  useEffect(() => {
    if (!currentWorkspace) return

    loadUnreadCount()
    const channel = supabase
      .channel('notifications-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, loadUnreadCount)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentWorkspace, loadUnreadCount])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname === path || pathname?.startsWith(path + '/')
  }

  const navItems = [
    { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
    { href: '/dashboard/notes', label: 'Notes', icon: FileText },
    { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/dashboard/team', label: 'Team', icon: Users },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
    { href: '/dashboard/plans', label: 'Plans', icon: Target },
    { href: '/dashboard/workspaces', label: 'Workspaces', icon: Building2 },
    { href: '/dashboard/time-tracker', label: 'Time', icon: Timer },
    { href: '/dashboard/finance', label: 'Finance', icon: DollarSign },
    { href: '/dashboard/settings/webhooks', label: 'Webhooks', icon: Webhook },
  ]

  return (
    <>
    <header className="z-20 h-16 px-3 sm:px-4 lg:px-6 border-b border-white/10 bg-transparent backdrop-blur-xl flex items-center justify-between sticky top-0 text-white">
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0 flex-1">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-1.5 sm:gap-2 group flex-shrink-0">
             <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                 <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
             </div>
             <span className="font-bold text-sm sm:text-lg text-white tracking-tight">TrackWork<span className="text-primary">.</span></span>
          </Link>

          {/* Separator */}
          <div className="h-6 w-px bg-white/10 hidden lg:block" />

          {/* Home crumb */}
          <Link href="/dashboard" className="hidden lg:block flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/5 gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </Button>
          </Link>

          <div className="h-6 w-px bg-white/10 hidden lg:block" />

          {/* Main Navigation */}
          <nav className="hidden md:flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
            {navItems.slice(0, 7).map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={clsx(
                    'text-sm gap-2 hover:bg-white/5 flex-shrink-0',
                    isActive(href) ? 'bg-white/10 text-white shadow-sm shadow-primary/30' : 'text-white/80'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{label}</span>
                </Button>
              </Link>
            ))}
            {/* Desktop More menu */}
            {navItems.length > 7 && (
              <div className="relative flex-shrink-0 desktop-menu">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm gap-2 hover:bg-white/5 text-white/80"
                  onClick={() => setShowDesktopMenu(!showDesktopMenu)}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden lg:inline">More</span>
                </Button>
                <AnimatePresence>
                  {showDesktopMenu && (
                    <>
                      <div className="fixed inset-0 z-[99]" onClick={() => setShowDesktopMenu(false)} />
                      <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="fixed top-16 left-4 mt-14 w-48 p-1 rounded-xl bg-surface border border-border shadow-2xl overflow-hidden z-[100]"
                    >
                      {navItems.slice(7).map(({ href, label, icon: Icon }) => (
                        <Link key={href} href={href} onClick={() => setShowDesktopMenu(false)}>
                          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition-colors">
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{label}</span>
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0">
          <div className="hidden lg:block">
            <WorkspaceSwitcher />
          </div>

          <div className="h-6 w-px bg-border hidden lg:block" />

          {/* Mobile Workspace Switcher */}
          <div className="relative lg:hidden mobile-workspace-menu">
            <Button
              variant="ghost"
              size="sm"
              className="relative text-text-secondary hover:text-white p-2"
              onClick={() => setShowMobileWorkspaceMenu(!showMobileWorkspaceMenu)}
            >
              <Building2 className="w-5 h-5" />
            </Button>
            <AnimatePresence>
              {showMobileWorkspaceMenu && (
                <>
                  <div className="fixed inset-0 z-[99]" onClick={() => setShowMobileWorkspaceMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed top-16 right-4 mt-14 w-64 p-1 rounded-xl bg-surface border border-border shadow-2xl overflow-hidden z-[100]"
                  >
                  <div className="p-3 border-b border-border/50 mb-1">
                    <p className="text-sm font-medium text-white">Switch Workspace</p>
                    <p className="text-xs text-text-muted">Select a workspace to work in</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        onClick={() => {
                          setCurrentWorkspace(workspace)
                          setShowMobileWorkspaceMenu(false)
                        }}
                        className={clsx(
                          'w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-white/5 transition-colors',
                          currentWorkspace?.id === workspace.id
                            ? 'bg-primary/10 text-primary'
                            : 'text-text-secondary hover:text-white'
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{workspace.name}</p>
                          {currentWorkspace?.id === workspace.id && (
                            <p className="text-xs text-primary">Current workspace</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border/50 mt-1 pt-1">
                    <Link href="/dashboard/workspaces" onClick={() => setShowMobileWorkspaceMenu(false)}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-sm">Manage Workspaces</span>
                      </div>
                    </Link>
                  </div>
                </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative text-text-secondary hover:text-white"
              onClick={() => setShowNotifications(true)}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger ring-2 ring-background" />
            )}
          </Button>
          
          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
             <div onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <Avatar 
                src={profile.avatar_url || undefined}
                fallback={profile.username ? profile.username.substring(0,2).toUpperCase() : 'ME'}
                alt={profile.username || 'User Profile'}
                  className="cursor-pointer hover:ring-2 ring-primary/50 transition-all border border-white/10"
                />
             </div>

             <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-[99]" onClick={() => setShowProfileMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="fixed top-16 right-2 mt-14 w-56 p-1 rounded-xl bg-surface border border-border shadow-2xl overflow-hidden z-[100]"
                    >
                     <div className="p-2 border-b border-border/50 mb-1">
                        <p className="text-sm font-medium text-white">My Account</p>
                        <p className="text-xs text-text-muted">Manage your profile</p>
                     </div>
                     <Link href="/dashboard/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition-colors">
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">Settings</span>
                     </Link>
                     <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Sign Out</span>
                     </button>
                  </motion.div>
                  </>
                )}
             </AnimatePresence>
          </div>
        </div>
    </header>

    {/* Mobile horizontal nav under the topbar */}
    <div className="md:hidden sticky top-16 z-[90] bg-transparent border-b border-white/10 backdrop-blur-xl">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        <Link href="/dashboard" className="shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-2 rounded-full bg-white/5 text-white/90 hover:bg-white/10"
          >
            <Home className="w-4 h-4" />
            Home
          </Button>
        </Link>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className={clsx(
                'text-xs gap-2 rounded-full px-3 bg-white/0 text-white/80 hover:bg-white/10',
                isActive(href) && 'bg-white/15 text-white shadow-sm shadow-primary/40'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
    <NotificationCenter
      isOpen={showNotifications}
      onClose={() => setShowNotifications(false)}
      workspaceId={currentWorkspace?.id || ''}
    />
    </>
  )
}
