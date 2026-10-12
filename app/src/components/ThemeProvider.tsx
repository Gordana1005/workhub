'use client'

import { useEffect } from 'react'
import { hydrateTheme, useThemeStore, type ThemeChoice } from '@/stores/useThemeStore'

function resolvedDark(theme: ThemeChoice) {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme() {
  const dark = resolvedDark(useThemeStore.getState().theme)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateTheme()
    applyTheme()
    const unsubscribe = useThemeStore.subscribe(applyTheme)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', applyTheme)
    return () => {
      unsubscribe()
      media.removeEventListener('change', applyTheme)
    }
  }, [])

  return <>{children}</>
}
