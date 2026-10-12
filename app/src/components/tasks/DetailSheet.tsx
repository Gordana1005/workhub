'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useVisualViewport } from '@/hooks/useVisualViewport'

/**
 * Modal shell for the task detail panel.
 * - phone: full-screen sheet that shrinks to the visible area while the on-screen keyboard is open
 * - sm+ "drawer": right-hand side panel (used on laptop/tablet where the panel is not inline)
 * - sm+ "center": centred dialog (used by the Home screen)
 * - sm+ "wide": large two-column dialog (task editor opened from Home / project pages)
 */
export default function DetailSheet({
  label,
  onClose,
  variant = 'drawer',
  children,
}: {
  label: string
  onClose: () => void
  variant?: 'drawer' | 'center' | 'wide'
  children: ReactNode
}) {
  const t = useTranslations('pages.tasks')
  const panelRef = useRef<HTMLDivElement>(null)
  const keyboard = useVisualViewport(true)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      // a confirm dialog / picker stacked on top handles Escape itself
      const modals = document.querySelectorAll('[role="dialog"][aria-modal="true"]')
      if (modals.length && modals[modals.length - 1] !== panelRef.current) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
      previousFocus?.focus?.()
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  const drawer = variant === 'drawer'
  const wide = variant === 'wide'
  // phone only: follow the visible area so the sticky footer stays above the keyboard
  const phoneKeyboard = keyboard && window.innerWidth < 640 ? keyboard : null

  return createPortal(
    <div
      className={`fixed inset-x-0 z-[80] flex ${phoneKeyboard ? '' : 'inset-y-0'} ${
        drawer ? 'justify-end' : 'items-end justify-center sm:items-center sm:p-6'
      }`}
      style={phoneKeyboard ? { top: phoneKeyboard.top, height: phoneKeyboard.height } : undefined}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('close')}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={drawer ? { opacity: 0, x: 24 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`relative flex w-full flex-col overflow-hidden bg-surface text-text-primary shadow-xl focus:outline-none ${
          phoneKeyboard ? 'h-full' : 'h-[100dvh]'
        } ${
          drawer
            ? 'sm:h-[100dvh] sm:w-[520px] sm:border-l sm:border-border'
            : wide
              ? 'sm:h-[min(86dvh,760px)] sm:max-w-[1040px] sm:rounded-2xl sm:border sm:border-border'
              : 'sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-border'
        }`}
      >
        {children}
      </motion.div>
    </div>,
    document.body
  )
}
