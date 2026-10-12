'use client'

/**
 * TaskPicker: task chooser for the timer and time-entry form.
 * - md+: a native <select> (fast with a keyboard).
 * - phone/tablet: a 44px button that opens a searchable, full-height sheet with 56px rows.
 */
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'

export interface PickerTask {
  id: string
  title: string
  project?: { name: string }
}

const controlClass =
  'w-full max-w-full rounded-lg border border-border-control bg-secondary px-3 text-base text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 sm:text-sm'

export function TaskPicker({
  value,
  onChange,
  tasks,
  label,
  className = '',
}: {
  value: string
  onChange: (id: string) => void
  tasks: PickerTask[]
  /** Accessible name and sheet title */
  label: string
  className?: string
}) {
  const t = useTranslations('pages.tools.time')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = tasks.find((task) => task.id === value)

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return tasks
    return tasks.filter(
      (task) => task.title.toLowerCase().includes(needle) || (task.project?.name ?? '').toLowerCase().includes(needle)
    )
  }, [tasks, search])

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      <div className={`relative hidden md:block ${className}`}>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className={`${controlClass} h-10 appearance-none pr-9`}
        >
          <option value="">{t('selectTask')}</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
              {task.project ? ` (${task.project.name})` : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        className={`${controlClass} flex h-11 items-center justify-between gap-2 text-left active:bg-tertiary md:hidden ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-text-muted'}`}>
          {selected ? selected.title : t('selectTask')}
        </span>
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-text-muted" />
      </button>

      <Dialog
        open={open}
        title={label}
        size="sm"
        onClose={() => {
          setOpen(false)
          setSearch('')
        }}
      >
        <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-5">
          <div className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-3 sm:px-6">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('searchTasks')}
                aria-label={t('searchTasks')}
                enterKeyHint="search"
                autoCapitalize="none"
                className={`${controlClass} h-11 pl-9`}
              />
            </div>
          </div>
          <ul>
            <li>
              <button
                type="button"
                onClick={() => pick('')}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left text-base text-text-secondary active:bg-tertiary sm:px-6"
              >
                <span className="min-w-0 flex-1">{t('selectTask')}</span>
                {value === '' ? <Check aria-hidden className="h-5 w-5 shrink-0 text-primary" /> : null}
              </button>
            </li>
            {visible.map((task) => (
              <li key={task.id} className="border-t border-border">
                <button
                  type="button"
                  onClick={() => pick(task.id)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-tertiary sm:px-6"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-base text-text-primary">{task.title}</span>
                    {task.project ? (
                      <span className="mt-0.5 block truncate text-xs text-text-secondary">{task.project.name}</span>
                    ) : null}
                  </span>
                  {task.id === value ? <Check aria-hidden className="h-5 w-5 shrink-0 text-primary" /> : null}
                </button>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="border-t border-border px-4 py-8 text-center text-sm text-text-secondary">
                {t('noTasks')}
              </li>
            ) : null}
          </ul>
        </div>
      </Dialog>
    </>
  )
}
