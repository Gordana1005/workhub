'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useThemeStore } from '@/stores/useThemeStore'

const options: { id: 'light' | 'dark' | 'system'; icon: LucideIcon }[] = [
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
  { id: 'system', icon: Monitor },
]

export default function ThemeSwitch() {
  const t = useTranslations('theme')
  const { theme, setTheme } = useThemeStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])

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
  }, [open, close])

  const current = options.find((option) => option.id === theme) ?? options[0]
  const CurrentIcon = current.icon

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-hover active:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t(current.id)}
        onClick={() => setOpen((value) => !value)}
      >
        <CurrentIcon className="h-5 w-5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          {options.map(({ id, icon: Icon }) => {
            const selected = theme === id
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                  selected
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-surface-hover'
                }`}
                onClick={() => {
                  setTheme(id)
                  close()
                }}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{t(id)}</span>
                <Check className={`h-4 w-4 ${selected ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
