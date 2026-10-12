'use client'

import { useTranslations } from 'next-intl'
import { useLocaleSwitch } from '@/i18n/LocaleProvider'

const locales = [
  { id: 'en' as const, label: 'EN' },
  { id: 'mk' as const, label: 'МК' },
]

export default function LanguageSwitch() {
  const t = useTranslations('shell')
  const { locale, setLocale } = useLocaleSwitch()

  return (
    <div
      role="radiogroup"
      aria-label={t('language')}
      className="relative inline-flex h-10 items-center rounded-xl after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:ring-1 after:ring-inset after:ring-border"
    >
      {locales.map(({ id, label }) => {
        const selected = locale === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`h-10 min-w-10 rounded-xl px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              selected
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-surface-hover'
            }`}
            onClick={() => setLocale(id)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
