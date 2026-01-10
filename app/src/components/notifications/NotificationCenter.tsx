import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, Trash2, X, Clock, User, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
  related_user?: {
    username: string
    email: string
  }
  related_task?: {
    title: string
  }
}

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
}

export default function NotificationCenter({ isOpen, onClose, workspaceId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const router = useRouter()

  const loadNotifications = useCallback(async () => {
    try {
      const unreadOnly = filter === 'unread'
      const response = await fetch(`/api/notifications?unread_only=${unreadOnly}&limit=50`)
      if (!response.ok) throw new Error('Failed to load notifications')
      
      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  const subscribeToNotifications = useCallback(() => {
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          
          // Show browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/icon-192.png',
              badge: '/icon-192.png'
            })
          }
        }
      )
      .subscribe()

    return channel
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
      const channel = subscribeToNotifications()

      return () => {
        channel?.unsubscribe()
      }
    }

    return undefined
  }, [isOpen, filter, loadNotifications, subscribeToNotifications])

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    // Navigate to link if exists
    if (notification.link) {
      router.push(notification.link)
      onClose()
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
      }
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const clearAllRead = async () => {
    if (!confirm('Delete all read notifications?')) return

    try {
      const response = await fetch('/api/notifications?delete_all=true', {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => !n.read))
      }
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, any> = {
      task_assigned: User,
      task_due: Clock,
      task_overdue: AlertCircle,
      task_completed: CheckCircle,
      comment_mention: MessageSquare,
      dependency_unblocked: CheckCircle,
      project_update: Bell
    }
    const Icon = icons[type] || Bell
    return <Icon className="w-5 h-5" />
  }

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      task_assigned: 'text-blue-400 bg-blue-500/10',
      task_due: 'text-yellow-400 bg-yellow-500/10',
      task_overdue: 'text-red-400 bg-red-500/10',
      task_completed: 'text-green-400 bg-green-500/10',
      comment_mention: 'text-purple-400 bg-purple-500/10',
      dependency_unblocked: 'text-emerald-400 bg-emerald-500/10',
      project_update: 'text-indigo-400 bg-indigo-500/10'
    }
    return colors[type] || 'text-slate-400 bg-slate-500/10'
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Actions */}
            {notifications.length > 0 && (
              <div className="flex gap-2 mt-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Mark All Read
                  </button>
                )}
                <button
                  onClick={clearAllRead}
                  className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Read
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Bell className="w-16 h-16 text-slate-700 mb-4" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </h3>
                <p className="text-slate-500 text-sm">
                  {filter === 'unread' 
                    ? "You're all caught up!" 
                    : "You'll see notifications here when something happens"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                      !notification.read ? 'bg-slate-800/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`font-semibold text-sm ${
                            !notification.read ? 'text-white' : 'text-slate-300'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>

                        <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>

                          <button
                            onClick={(e) => deleteNotification(notification.id, e)}
                            className="p-1 hover:bg-slate-700 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-slate-500 hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
