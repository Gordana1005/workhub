'use client'

import { useTranslations } from 'next-intl'
import { readableOn } from '@/components/projects/projectUtils'

const KNOWN_CATEGORIES = ['personal', 'work', 'client', 'team', 'freelance', 'education', 'other']

/** Coloured initial for a workspace (colour is the workspace's own choice). */
export function WorkspaceTile({
  name,
  color,
  size = 'md',
}: {
  name: string
  color?: string | null
  size?: 'md' | 'lg'
}) {
  const background = color || '#667eea'
  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-xl font-semibold ${
        size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'
      }`}
      style={{ backgroundColor: background, color: readableOn(background) }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}

/** Localised label for a workspace category (falls back to the raw value). */
export function useWorkspaceCategoryLabel() {
  const t = useTranslations('pages.people')
  return (category?: string | null) => {
    if (!category) return ''
    return KNOWN_CATEGORIES.includes(category) ? t(`form.categories.${category}`) : category
  }
}
