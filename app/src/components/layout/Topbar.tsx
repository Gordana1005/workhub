'use client'

import { useState, useEffect, useCallback } from 'react'
import { Menu, Bell, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import NotificationCenter from '../notifications/NotificationCenter'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter()
  const { currentWorkspace } = useWorkspaceStore()
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  useEffect(() => {
    if (currentWorkspace) {
      loadUnreadCount()
      subscribeToNotifications()
    }

    return () => {
      supabase.channel('notifications-count').unsubscribe()
    }
  }, [currentWorkspace])

  const loadUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications?unread_only=true')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.notifications?.length || 0)
      }
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          loadUnreadCount()
        }
      )
      .subscribe()

    return channel
  }

  return (
    <>
      <header className="h-16 px-6 border-b border-gray-200 dark:border-gray-700 bg-surface shadow-neumorphic dark:shadow-neumorphic-dark flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-text-primary">worktrack</h1>
          
          {/* Workspace Switcher */}
          <div className="hidden md:block">
            <WorkspaceSwitcher />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
        </div>
      </header>

      {/* Notification Center */}
      {currentWorkspace && (
        <NotificationCenter
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          workspaceId={currentWorkspace.id}
        />
      )}
    </>
  )
}
