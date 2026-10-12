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
      className="inline-flex h-9 items-center rounded-xl border border-border p-0.5"
    >
      {locales.map(({ id, label }) => {
        const selected = locale === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`h-full rounded-xl px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              selected ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-hover'
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
