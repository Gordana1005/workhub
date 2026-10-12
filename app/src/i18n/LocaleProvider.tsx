'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl'
import en from '@/messages/en.json'
import mk from '@/messages/mk.json'
import authEn from '@/messages/parts/auth.en.json'
import authMk from '@/messages/parts/auth.mk.json'
import homeEn from '@/messages/parts/home.en.json'
import homeMk from '@/messages/parts/home.mk.json'
import projectsEn from '@/messages/parts/projects.en.json'
import projectsMk from '@/messages/parts/projects.mk.json'
import tasksEn from '@/messages/parts/tasks.en.json'
import tasksMk from '@/messages/parts/tasks.mk.json'
import notesEn from '@/messages/parts/notes.en.json'
import notesMk from '@/messages/parts/notes.mk.json'
import plansEn from '@/messages/parts/plans.en.json'
import plansMk from '@/messages/parts/plans.mk.json'
import peopleEn from '@/messages/parts/people.en.json'
import peopleMk from '@/messages/parts/people.mk.json'
import toolsEn from '@/messages/parts/tools.en.json'
import toolsMk from '@/messages/parts/tools.mk.json'

export type AppLocale = 'en' | 'mk'

const STORAGE_KEY = 'trackwork-locale'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const catalogs: Record<AppLocale, AbstractIntlMessages> = {
  en: { ...en, pages: { auth: authEn, home: homeEn, projects: projectsEn, tasks: tasksEn, notes: notesEn, plans: plansEn, people: peopleEn, tools: toolsEn } },
  mk: { ...mk, pages: { auth: authMk, home: homeMk, projects: projectsMk, tasks: tasksMk, notes: notesMk, plans: plansMk, people: peopleMk, tools: toolsMk } },
}

interface LocaleContextValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => {},
})

function isLocale(value: unknown): value is AppLocale {
  return value === 'en' || value === 'mk'
}

function readCookie(): AppLocale | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${STORAGE_KEY}=([^;]*)`))
    const value = match ? decodeURIComponent(match[1]) : null
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

function readStorage(): AppLocale | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

// The cookie is what the server layout reads, so SSR and the first client render agree
function persistLocale(locale: AppLocale) {
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${STORAGE_KEY}=${locale}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`
  } catch {}
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {}
  document.documentElement.lang = locale
}

export function useLocaleSwitch() {
  return useContext(LocaleContext)
}

export function LocaleProvider({
  children,
  initialLocale = 'en',
}: {
  children: React.ReactNode
  initialLocale?: AppLocale
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale)

  // Migrate legacy localStorage-only users to the cookie and keep both stores in sync.
  // The server already rendered `initialLocale` from the cookie, so there is no flash for them.
  useEffect(() => {
    const resolved = readCookie() ?? readStorage() ?? initialLocale
    if (resolved !== initialLocale) setLocaleState(resolved)
    persistLocale(resolved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLocale = (next: AppLocale) => {
    setLocaleState(next)
    persistLocale(next)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Skopje">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  )
}
