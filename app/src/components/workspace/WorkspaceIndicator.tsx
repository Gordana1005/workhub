'use client'

import { useTranslations } from 'next-intl'
import { Building2 } from 'lucide-react'

interface WorkspaceIndicatorProps {
  name: string
  color?: string
  category?: string
  size?: 'sm' | 'md' | 'lg'
  showCategory?: boolean
  className?: string
}

export default function WorkspaceIndicator({
  name,
  color = '#667eea',
  category,
  size = 'md',
  showCategory = false,
  className = '',
}: WorkspaceIndicatorProps) {
  const t = useTranslations('pages.people')
  const categoryLabel = (() => {
    switch (category) {
      case 'personal':
        return t('form.categories.personal')
      case 'work':
        return t('form.categories.work')
      case 'client':
        return t('form.categories.client')
      case 'team':
        return t('form.categories.team')
      case 'freelance':
        return t('form.categories.freelance')
      case 'education':
        return t('form.categories.education')
      case 'other':
        return t('form.categories.other')
      default:
        return category
    }
  })()
  const sizeClasses = {
    sm: {
      dot: 'w-2 h-2',
      text: 'text-xs',
      container: 'gap-2',
    },
    md: {
      dot: 'w-3 h-3',
      text: 'text-sm',
      container: 'gap-2',
    },
    lg: {
      dot: 'w-4 h-4',
      text: 'text-base',
      container: 'gap-3',
    },
  }

  const classes = sizeClasses[size]

  return (
    <div className={`flex items-center ${classes.container} ${className}`}>
      {color ? (
        <div
          className={`${classes.dot} rounded-full flex-shrink-0 ring-1 ring-border`}
          style={{ backgroundColor: color }}
        />
      ) : (
        <Building2 className={`${classes.dot === 'w-2 h-2' ? 'w-3 h-3' : classes.dot === 'w-3 h-3' ? 'w-4 h-4' : 'w-5 h-5'} text-text-secondary flex-shrink-0`} />
      )}
      
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-text-primary truncate ${classes.text}`}>
          {name}
        </div>
        {showCategory && category && (
          <div className={`text-text-secondary truncate ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
            {categoryLabel}
          </div>
        )}
      </div>
    </div>
  )
}
