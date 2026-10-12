'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { ChevronDown, Plus, Check, Building2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'
import { Badge } from '@/components/ui/Badge'

export default function WorkspaceSwitcher() {
  const t = useTranslations('pages.people')
  const locale = useLocale()
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    loading,
  } = useWorkspaceStore()
  
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleWorkspaceSwitch = (workspace: typeof currentWorkspace) => {
    setCurrentWorkspace(workspace)
    setIsOpen(false)
  }

  const categoryLabel = (value: string) => {
    switch (value) {
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
        return value
    }
  }

  const memberLabel = (count: number) => {
    const mod10 = count % 10
    const mod100 = count % 100
    const one = mod10 === 1 && mod100 !== 11
    const few = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
    if (locale === 'mk') {
      if (one) return t('switcher.memberOne', { count })
      if (few) return t('switcher.memberFew', { count })
      return t('switcher.memberMany', { count })
    }
    return count === 1
      ? t('switcher.memberOne', { count })
      : t('switcher.memberOther', { count })
  }

  if (!mounted) {
    return (
      <div className="h-10 w-full max-w-full rounded-lg bg-surface-hover sm:w-60" />
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex w-full min-w-0 max-w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 transition-all duration-200 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[280px]"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {loading ? (
            <Loader2 className="w-5 h-5 text-text-muted animate-spin flex-shrink-0" />
          ) : (
            <>
              {currentWorkspace ? (
                <div
                  className="w-4 h-4 rounded-md flex-shrink-0 ring-1 ring-border"
                  style={{ backgroundColor: currentWorkspace.color || 'var(--brand-blue)' }}
                />
              ) : (
                <Building2 className="w-5 h-5 text-text-muted flex-shrink-0" />
              )}
            </>
          )}
          
          <div className="flex-1 min-w-0 text-left">
            <div className="font-medium text-text-primary text-sm truncate">
              {currentWorkspace?.name || t('switcher.select')}
            </div>
            {currentWorkspace?.category && (
              <div className="text-xs text-text-secondary truncate">
                {categoryLabel(currentWorkspace.category)}
              </div>
            )}
          </div>
        </div>

        <ChevronDown 
          className={clsx('w-4 h-4 text-text-muted transition-transform duration-200 flex-shrink-0', isOpen && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-2 border-b border-border">
              <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
                {t('switcher.title')}
              </div>
            </div>

            {/* Workspaces List */}
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {workspaces.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Building2 className="w-10 h-10 text-text-muted mx-auto mb-2" />
                  <p className="text-text-secondary text-sm">{t('switcher.empty')}</p>
                </div>
              ) : (
                <div className="py-1">
                  {workspaces.map((workspace) => {
                    const isActive = currentWorkspace?.id === workspace.id
                    
                    return (
                      <button
                        key={workspace.id}
                        onClick={() => handleWorkspaceSwitch(workspace)}
                        className={twMerge(clsx(
                            'w-full px-4 py-3 flex items-center gap-3 transition-colors border-l-2',
                            isActive
                                ? 'bg-primary/5 text-primary border-primary'
                                : 'hover:bg-surface-hover text-text-primary border-transparent'
                        ))}
                      >
                        {/* Color Indicator */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: workspace.color || 'var(--brand-blue)' }}
                        />

                        {/* Workspace Info */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {workspace.name}
                            </span>
                            {workspace.userRole === 'admin' && (
                              <Badge variant="blue" size="sm" className="px-1.5 py-0">{t('switcher.admin')}</Badge>
                            )}
                          </div>
                          {workspace.memberCount && (
                            <div className="text-xs text-text-muted mt-0.5">
                              {memberLabel(workspace.memberCount)}
                            </div>
                          )}
                        </div>

                        {/* Active Indicator */}
                        {isActive && (
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-border bg-background/50 p-2 space-y-1">
              <Link
                href="/dashboard/workspaces"
                className="w-full px-3 py-2 flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-6 h-6 rounded flex items-center justify-center bg-surface border border-border">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium">{t('switcher.manageAll')}</span>
              </Link>
              
              <Link
                href="/dashboard/workspaces?create=true"
                className="w-full px-3 py-2 flex items-center gap-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-6 h-6 rounded flex items-center justify-center border border-primary/20">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium">{t('switcher.addNew')}</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
