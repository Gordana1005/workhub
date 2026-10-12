'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Building2, CheckSquare, FileText, FolderKanban, Plus, Target, type LucideIcon } from 'lucide-react'

export type CreateKind = 'task' | 'project' | 'note' | 'workspace' | 'plan'

const items: { kind: CreateKind; icon: LucideIcon }[] = [
  { kind: 'task', icon: CheckSquare },
  { kind: 'project', icon: FolderKanban },
  { kind: 'note', icon: FileText },
  { kind: 'workspace', icon: Building2 },
  { kind: 'plan', icon: Target },
]

export default function NewMenu({ onCreate }: { onCreate: (kind: CreateKind) => void }) {
  const t = useTranslations('shell')
  const create = useTranslations('create')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-3"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Plus className="h-4 w-4" />
        {t('new')}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          {items.map(({ kind, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-text-secondary hover:bg-surface-hover"
              onClick={() => {
                onCreate(kind)
                close()
              }}
            >
              <Icon className="h-4 w-4" />
              {create(kind)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
