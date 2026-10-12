'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Bell, CheckCheck, Trash2, X, Clock, User, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { enUS, mk } from 'date-fns/locale'
import { useLocaleSwitch } from '@/i18n/LocaleProvider'
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

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const t = useTranslations('pages.tools')
  const { locale } = useLocaleSwitch()
  const dateLocale = locale === 'mk' ? mk : enUS
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [userId, setUserId] = useState<string | null>(null)
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
    if (!userId) return null

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])

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
  }, [userId])

  useEffect(() => {
    if (!isOpen) return undefined

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const resolveUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUserId(data.user?.id || null)
    }

    resolveUser()
    loadNotifications()
    const channel = subscribeToNotifications()

    return () => {
      document.body.style.overflow = previous
      channel?.unsubscribe()
    }
  }, [isOpen, filter, loadNotifications, subscribeToNotifications])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }

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
    if (!confirm(t('notifications.deleteReadConfirm'))) return

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
    return <Icon className="h-5 w-5" />
  }

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      task_assigned: 'text-primary bg-primary/10',
      task_due: 'text-warning bg-warning/10',
      task_overdue: 'text-danger bg-danger/10',
      task_completed: 'text-success bg-success/10',
      comment_mention: 'text-primary bg-primary/10',
      dependency_unblocked: 'text-success bg-success/10',
      project_update: 'text-primary bg-primary/10'
    }
    return colors[type] || 'text-text-primary bg-surface-hover'
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label={t('finance.close')}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('notifications.title')}
        className="absolute inset-0 flex h-[100dvh] w-full flex-col bg-surface text-text-primary sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-w-md sm:border-l sm:border-border sm:shadow-xl"
      >
        <div className="border-b border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary">{t('notifications.title')}</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('finance.close')}
              className="shrink-0 rounded-lg p-2 text-text-primary hover:bg-surface-hover"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-hover p-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                filter === 'all' ? 'bg-primary text-white' : 'text-text-primary hover:bg-surface'
              }`}
            >
              {t('notifications.all')}
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                filter === 'unread' ? 'bg-primary text-white' : 'text-text-primary hover:bg-surface'
              }`}
            >
              {t('notifications.unread', { count: unreadCount })}
            </button>
          </div>

          {notifications.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-text-primary hover:bg-surface-hover"
                >
                  <CheckCheck className="h-3 w-3" />
                  {t('notifications.markAllRead')}
                </button>
              )}
              <button
                type="button"
                onClick={clearAllRead}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-text-primary hover:bg-surface-hover"
              >
                <Trash2 className="h-3 w-3" />
                {t('notifications.clearRead')}
              </button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Bell className="mb-4 h-12 w-12 text-text-muted" />
              <h3 className="text-base font-semibold text-text-primary">
                {filter === 'unread' ? t('notifications.noUnread') : t('notifications.noNotifications')}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {filter === 'unread'
                  ? t('notifications.caughtUp')
                  : t('notifications.emptyHint')}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredNotifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`flex gap-3 p-4 ${!notification.read ? 'bg-primary/10' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className="flex min-w-0 flex-1 gap-3 text-left"
                  >
                    <span className={`mt-0.5 h-fit shrink-0 rounded-lg p-2 ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 flex items-start justify-between gap-2">
                        <span className="break-words text-sm font-semibold text-text-primary">
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </span>
                      <span className="mb-2 line-clamp-2 block break-words text-sm text-text-primary">
                        {notification.message}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: dateLocale })}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => deleteNotification(notification.id, e)}
                    className="h-fit shrink-0 rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-danger"
                    aria-label={t('finance.remove')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
