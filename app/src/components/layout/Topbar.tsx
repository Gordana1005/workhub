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
  Menu,
  Webhook,
  Users,
  Timer,
  FileText,
  Building2
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

interface TopbarProps {
  onMenuToggle?: () => void
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { currentWorkspace } = useWorkspaceStore()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [profile, setProfile] = useState<{ username: string; avatar_url?: string | null }>({ username: '', avatar_url: null })
  const [userId, setUserId] = useState<string | null>(null)
  
  // Profile dropdown state
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
    { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/dashboard/plans', label: 'Plans', icon: Target },
    { href: '/dashboard/notes', label: 'Notes', icon: FileText },
    { href: '/dashboard/workspaces', label: 'Workspaces', icon: Building2 },
    { href: '/dashboard/time-tracker', label: 'Time', icon: Timer },
    { href: '/dashboard/team', label: 'Team', icon: Users },
    { href: '/dashboard/finance', label: 'Finance', icon: DollarSign },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
    { href: '/dashboard/settings/webhooks', label: 'Webhooks', icon: Webhook },
  ]

  return (
    <>
    <header className="h-16 px-6 border-b border-border bg-secondary/50 backdrop-blur-md flex items-center justify-between z-50 sticky top-0">
        <div className="flex items-center gap-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-text-secondary hover:text-white"
            onClick={onMenuToggle}
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
             <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                 <Zap className="w-5 h-5 fill-current" />
             </div>
             <span className="font-bold text-lg text-white hidden md:block tracking-tight">TrackWork<span className="text-primary">.</span></span>
          </Link>

          {/* Separator */}
          <div className="h-6 w-px bg-border hidden md:block" />

          {/* Main Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={clsx(
                    'text-sm gap-2',
                    isActive(href) ? 'bg-white/5 text-white' : 'text-text-secondary'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard/focus">
             <Button size="sm" className="hidden md:flex bg-primary/10 text-primary hover:bg-primary hover:text-white border-transparent gap-2">
                <Zap className="w-4 h-4" />
                Focus Mode
             </Button>
          </Link>

          <div className="hidden md:block">
            <WorkspaceSwitcher />
          </div>

          <div className="h-6 w-px bg-border hidden md:block" />

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
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-56 p-1 rounded-xl bg-surface border border-border shadow-2xl overflow-hidden z-50"
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
                )}
             </AnimatePresence>
          </div>
        </div>
    </header>
    <NotificationCenter
      isOpen={showNotifications}
      onClose={() => setShowNotifications(false)}
      workspaceId={currentWorkspace?.id || ''}
    />
    </>
  )
}
