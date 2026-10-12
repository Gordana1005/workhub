'use client'

import { useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'

export interface NoteTag {
  id: string
  name: string
  color: string
  workspace_id?: string
}

export interface NoteProject {
  id: string
  name: string
}

export interface NoteRecord {
  id: string
  title: string
  content: string
  created_at: string
  updated_at?: string | null
  project_id?: string
  author_id?: string | null
  tags?: NoteTag[]
  project?: { name?: string | null } | null
  author?: { username?: string | null; avatar_url?: string | null } | null
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre)>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function countWords(html: string | null | undefined): number {
  const text = stripHtml(html)
  return text ? text.split(' ').length : 0
}

/** Soft tint for a tag chip background, derived from the tag's own hex colour. */
export function tagTint(color: string | undefined): string | undefined {
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) return `${color}24`
  return undefined
}

/** Relative and absolute date formatting, localised through next-intl. */
export function useNoteDates() {
  const t = useTranslations('pages.notes')
  const locale = useLocale()
  const intlLocale = locale === 'mk' ? 'mk-MK' : 'en-US'

  const relative = useCallback(
    (iso: string) => {
      const date = new Date(iso)
      const diffMs = Date.now() - date.getTime()
      const mins = Math.floor(diffMs / 60000)
      const hours = Math.floor(diffMs / 3600000)
      const days = Math.floor(diffMs / 86400000)

      if (mins < 1) return t('justNow')
      if (mins < 60) return t('minutesAgo', { count: mins })
      if (hours < 24) return t('hoursAgo', { count: hours })
      if (days === 1) return t('yesterday')
      if (days < 7) return t('daysAgo', { count: days })
      return date.toLocaleDateString(intlLocale, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      })
    },
    [t, intlLocale]
  )

  const full = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleDateString(intlLocale, { month: 'long', day: 'numeric', year: 'numeric' }),
    [intlLocale]
  )

  return { relative, full }
}
