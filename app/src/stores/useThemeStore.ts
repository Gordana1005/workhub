import { create } from 'zustand'

export type ThemeChoice = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'trackwork-theme'

interface ThemeStore {
  theme: ThemeChoice
  setTheme: (theme: ThemeChoice) => void
  toggleTheme: () => void
}

function readTheme(): ThemeChoice {
  if (typeof window === 'undefined') return 'system'
  let saved: string | null = null
  try { saved = window.localStorage.getItem(STORAGE_KEY) } catch {}
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'system'
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'system',
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(STORAGE_KEY, theme) } catch {}
    }
    set({ theme })
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
}))

export function hydrateTheme() {
  useThemeStore.getState().setTheme(readTheme())
}