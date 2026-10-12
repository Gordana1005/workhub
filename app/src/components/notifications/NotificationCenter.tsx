'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import {
  AlertCircle,
  Bell,
  CheckCheck,
  CheckCircle,
  Clock,
  MessageSquare,
  Target,
  Trash2,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getSessionUser } from '@/lib/auth-client'
import { format, isToday, isYesterday } from 'date-fns'
import { enUS, mk } from 'date-fns/locale'
import { useLocaleSwitch } from '@/i18n/LocaleProvider'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { IconMenu } from '@/components/ui/IconMenu'
import { Segmented } from '@/components/tools/Segmented'
import { Skeleton, SkeletonAvatar } from '@/components/ui/Skeleton'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  task_assigned: User,
  task_due: Clock,
  task_overdue: AlertCircle,
  task_completed: CheckCircle,
  comment_mention: MessageSquare,
  dependency_unblocked: CheckCircle,
  goal_completed: Target,
  project_update: Bell,
}

const TYPE_TONES: Record<string, string> = {
  task_assigned: 'text-primary bg-primary/10',
  task_due: 'text-warning bg-warning/10',
  task_overdue: 'text-danger bg-danger/10',
  task_completed: 'text-success bg-success/10',
  comment_mention: 'text-primary bg-primary/10',
  dependency_unblocked: 'text-success bg-success/10',
  goal_completed: 'text-success bg-success/10',
  project_update: 'text-primary bg-primary/10',
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const t = useTranslations('pages.tools')
  const tCommon = useTranslations('common')
  const { confirm, dialog } = useConfirm()
  const { locale } = useLocaleSwitch()
  const dateLocale = locale === 'mk' ? mk : enUS
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  // The shell passes a fresh onClose every render; keep it out of the effect deps.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=100')
      if (!response.ok) throw new Error('Failed to load notifications')

      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Open: lock page scroll, close on Escape, fetch the list and find out who is signed in.
  useEffect(() => {
    if (!isOpen) return undefined

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)

    setLoading(true)
    loadNotifications()
    getSessionUser().then((user) => setUserId(user?.id || null))

    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, loadNotifications])

  // Live updates while the panel is open.
  useEffect(() => {
    if (!isOpen || !userId) return undefined

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const incoming = payload.new as Notification
          setNotifications((prev) => (prev.some((item) => item.id === incoming.id) ? prev : [incoming, ...prev]))

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(incoming.title, {
              body: incoming.message,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
            })
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [isOpen, userId])

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      }
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    if (notification.link) {
      router.push(notification.link)
      onClose()
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const clearAllRead = async () => {
    if (!(await confirm({ title: t('notifications.deleteReadConfirm'), confirmLabel: t('notifications.clearRead') }))) return

    try {
      const response = await fetch('/api/notifications?delete_all=true', { method: 'DELETE' })

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => !n.read))
      }
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const visible = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications
  const hasRead = notifications.length > unreadCount

  // Group by calendar day, newest first (the API already returns newest first).
  const groups = useMemo(() => {
    const result: { key: string; label: string; items: Notification[] }[] = []
    visible.forEach((item) => {
      const date = new Date(item.created_at)
      const key = format(date, 'yyyy-MM-dd')
      let group = result.find((entry) => entry.key === key)
      if (!group) {
        group = {
          key,
          label: isToday(date)
            ? t('notifications.today')
            : isYesterday(date)
            ? t('notifications.yesterday')
            : format(date, 'EEEE, d MMMM', { locale: dateLocale }),
          items: [],
        }
        result.push(group)
      }
      group.items.push(item)
    })
    return result
  }, [visible, dateLocale, t])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <button type="button" aria-label={t('finance.close')} className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('notifications.title')}
        className="absolute inset-0 flex h-full w-full animate-fade-in flex-col overscroll-contain bg-surface text-text-primary sm:inset-y-0 sm:left-auto sm:right-0 sm:max-w-[26rem] sm:border-l sm:border-border sm:shadow-xl"
      >
        <header className="border-b border-border pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] sm:pl-4 sm:pr-4 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary">{t('notifications.title')}</h2>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
                  {unreadCount}
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {unreadCount > 0 ? (
                <Button type="button" variant="ghost" size="sm" onClick={markAllAsRead} className="gap-1.5">
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  {t('notifications.markAllRead')}
                </Button>
              ) : null}
              {hasRead ? (
                <IconMenu
                  label={t('finance.moreActions')}
                  items={[{ label: t('notifications.clearRead'), onClick: clearAllRead, danger: true }]}
                />
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label={t('finance.close')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary active:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-3">
            <Segmented
              fullWidth
              label={t('notifications.title')}
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('notifications.all') },
                { value: 'unread', label: t('notifications.unread', { count: unreadCount }) },
              ]}
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {loading ? (
            <div role="status" aria-label={tCommon('loading')} className="divide-y divide-border">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="flex items-start gap-3 px-4 py-3">
                  <SkeletonAvatar size={32} className="!rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Bell className="mb-4 h-10 w-10 text-text-muted" aria-hidden="true" />
              <h3 className="text-base font-semibold text-text-primary">
                {filter === 'unread' ? t('notifications.noUnread') : t('notifications.noNotifications')}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {filter === 'unread' ? t('notifications.caughtUp') : t('notifications.emptyHint')}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <h3 className="sticky top-0 z-10 bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {group.label}
                </h3>
                <ul className="divide-y divide-border">
                  {group.items.map((notification) => {
                    const Icon = TYPE_ICONS[notification.type] || Bell
                    return (
                      <li
                        key={notification.id}
                        className={`group relative flex items-start transition-colors hover:bg-surface-hover ${
                          notification.read ? '' : 'bg-primary/5'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className="flex min-w-0 flex-1 gap-3 px-4 py-3 text-left active:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              TYPE_TONES[notification.type] || 'bg-surface-hover text-text-secondary'
                            }`}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start gap-2">
                              <span
                                className={`min-w-0 flex-1 break-words text-sm text-text-primary ${
                                  notification.read ? 'font-medium' : 'font-semibold'
                                }`}
                              >
                                {notification.title}
                              </span>
                              {!notification.read ? (
                                <span
                                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                                  aria-label={t('notifications.unreadDot')}
                                />
                              ) : null}
                            </span>
                            <span className="mt-0.5 line-clamp-2 block break-words text-sm text-text-secondary">
                              {notification.message}
                            </span>
                            <span className="mt-1 block text-xs text-text-muted">
                              {format(new Date(notification.created_at), 'HH:mm')}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteNotification(notification.id)}
                          aria-label={t('finance.remove')}
                          className="mr-1 mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-muted transition-opacity hover:bg-surface hover:text-danger active:bg-surface-hover focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
      {dialog}
    </div>,
    document.body
  )
}
