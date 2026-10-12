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
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'system'
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'system',
  setTheme: (theme) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, theme)
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