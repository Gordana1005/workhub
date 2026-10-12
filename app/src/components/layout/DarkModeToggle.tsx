'use client'

import { useThemeStore } from '@/stores/useThemeStore'
import { Moon, Sun } from 'lucide-react'

export default function DarkModeToggle() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-text-primary" />
      ) : (
        <Sun className="w-5 h-5 text-text-primary" />
      )}
    </button>
  )
}