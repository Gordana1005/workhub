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

function initialLocale(): AppLocale {
  if (typeof window === 'undefined') return 'en'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'en' || saved === 'mk') return saved
  return window.navigator.language.toLowerCase().startsWith('mk') ? 'mk' : 'en'
}

export function useLocaleSwitch() {
  return useContext(LocaleContext)
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en')

  useEffect(() => {
    const next = initialLocale()
    setLocaleState(next)
    document.documentElement.lang = next
  }, [])

  const setLocale = (next: AppLocale) => {
    setLocaleState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="Europe/Skopje">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  )
}
