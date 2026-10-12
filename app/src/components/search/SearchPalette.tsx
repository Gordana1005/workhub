'use client'

/**
 * SearchPalette - global command palette (Ctrl/Cmd+K, "/").
 *
 *   - Empty query: recent searches + quick actions (create / go to). Typing filters the actions
 *     too and, from 2 characters, searches tasks, projects, notes, plans, people and comments.
 *   - Keyboard: Up/Down move, Enter opens, Esc closes, Tab / Shift+Tab jump between groups.
 *     Focus never leaves the input (combobox + listbox pattern), so typing always keeps working.
 *   - Phone: full-screen sheet with the input pinned on top (16px so iOS does not zoom).
 *   - Portal, z-[80] and the same scrim as ui/Dialog.
 */
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  CornerDownLeft,
  FileText,
  Flag,
  FolderKanban,
  Home,
  MessageSquare,
  Search,
  SearchX,
  Settings,
  Target,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Kbd } from '@/components/ui/Kbd'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import type { CreateKind } from '@/components/shell/NewMenu'
import {
  MIN_QUERY_LENGTH,
  clearRecent,
  loadRecent,
  pushRecent,
  useSearch,
  type SearchResult,
} from './useSearch'

interface Row {
  id: string
  kind: 'result' | 'action' | 'recent'
  title: string
  subtitle?: string
  icon: ReactNode
  trailing?: ReactNode
  /** Highlight the query inside title / subtitle (search results only). */
  highlight?: boolean
  onSelect: () => void
}

interface Section {
  key: string
  label: string
  rows: Row[]
  headerAction?: { label: string; onClick: () => void }
}

const tile = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-text-secondary'

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Wraps case-insensitive matches of `query` in <mark>. */
const Highlight = memo(function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim()
  if (!needle || !text) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, 'ig'))
  if (parts.length < 2) return <>{text}</>
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="rounded-sm bg-primary/15 px-px font-semibold text-text-primary">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  )
})

function parseDay(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export default function SearchPalette({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (kind: CreateKind) => void
}) {
  const t = useTranslations('search')
  const tNav = useTranslations('nav')
  const format = useFormatter()
  const router = useRouter()
  const pathname = usePathname()
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)
  const listId = useId()

  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const viaKeyboard = useRef(false)

  const trimmed = query.trim()
  const search = useSearch(query, workspaceId, open)

  useEffect(() => setMounted(true), [])

  // Fresh state every time the palette opens.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    setRecent(loadRecent())
  }, [open])

  // Scroll lock, focus in / out, Escape (capture, so page-level Esc handlers do not also fire).
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const raf = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = savedOverflow
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const finish = useCallback(
    (after?: () => void) => {
      onClose()
      if (after) window.setTimeout(after, 0)
    },
    [onClose]
  )

  const go = useCallback(
    (href: string, remember: boolean) => {
      if (remember) setRecent(pushRecent(trimmed))
      finish(() => {
        router.push(href)
        // Already on the tasks page: it will not remount, so tell it which task to open.
        const taskId = /^\/dashboard\/tasks\?task=([^&]+)/.exec(href)?.[1]
        if (taskId && pathname === '/dashboard/tasks') {
          window.dispatchEvent(new CustomEvent('trackwork:open-task', { detail: { id: decodeURIComponent(taskId) } }))
        }
      })
    },
    [finish, pathname, router, trimmed]
  )

  // ---- rows ----------------------------------------------------------------------------------

  const resultRow = useCallback(
    (result: SearchResult): Row => {
      const meta = result.meta
      let icon: ReactNode
      let subtitle = result.subtitle
      let trailing: ReactNode = null

      if (result.type === 'task') {
        const done = Boolean(meta.isCompleted)
        const due = done ? null : parseDay(meta.dueDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const overdue = due ? due.getTime() < today.getTime() : false
        icon = (
          <span className={tile}>
            {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}
          </span>
        )
        const project = typeof meta.project === 'string' ? meta.project : ''
        const assignee = typeof meta.assignee === 'string' ? meta.assignee : ''
        if (subtitle === project && assignee) subtitle = `${project} · ${assignee}`
        else if (!subtitle && assignee) subtitle = assignee
        trailing = done ? (
          <span className="text-xs text-success">{t('done')}</span>
        ) : due ? (
          <span className={`text-xs tabular-nums ${overdue ? 'font-medium text-danger' : 'text-text-muted'}`}>
            {format.dateTime(due, { month: 'short', day: 'numeric' })}
          </span>
        ) : null
      } else if (result.type === 'person') {
        icon = <Avatar src={typeof meta.avatarUrl === 'string' ? meta.avatarUrl : null} alt={result.title} size="sm" />
        trailing = meta.role ? (
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-text-secondary">
            {meta.role === 'admin' ? t('roleAdmin') : t('roleMember')}
          </span>
        ) : null
      } else if (result.type === 'milestone') {
        icon = (
          <span className={tile}>
            <Flag className="h-4 w-4" />
          </span>
        )
        subtitle = [t('milestone'), result.subtitle].filter(Boolean).join(' · ')
        const target = parseDay(meta.targetDate)
        trailing = meta.isCompleted ? (
          <span className="text-xs text-success">{t('done')}</span>
        ) : target ? (
          <span className="text-xs tabular-nums text-text-muted">{format.dateTime(target, { month: 'short', day: 'numeric' })}</span>
        ) : null
      } else if (result.type === 'comment') {
        icon = (
          <span className={tile}>
            <MessageSquare className="h-4 w-4" />
          </span>
        )
        subtitle = result.subtitle ? t('commentOn', { task: result.subtitle }) : ''
      } else {
        const Icon = result.type === 'project' ? FolderKanban : result.type === 'note' ? FileText : Target
        const color = result.type === 'project' && typeof meta.color === 'string' ? meta.color : null
        icon = (
          <span className={tile}>
            <Icon className="h-4 w-4" style={color ? { color } : undefined} />
          </span>
        )
      }

      return {
        id: `${result.type}:${result.id}`,
        kind: 'result',
        title: result.title || t('untitled'),
        subtitle,
        icon,
        trailing,
        highlight: true,
        onSelect: () => go(result.href, true),
      }
    },
    [format, go, t]
  )

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = []
    const needle = trimmed.toLowerCase()
    const searching = search.active

    if (!needle && recent.length > 0) {
      out.push({
        key: 'recent',
        label: t('recent'),
        headerAction: { label: t('clearRecent'), onClick: () => setRecent(clearRecent()) },
        rows: recent.map((item) => ({
          id: `recent:${item}`,
          kind: 'recent',
          title: item,
          icon: (
            <span className={tile}>
              <Clock className="h-4 w-4" />
            </span>
          ),
          onSelect: () => {
            setQuery(item)
            setActive(0)
            inputRef.current?.focus()
          },
        })),
      })
    }

    if (searching) {
      for (const group of search.groups) {
        out.push({
          key: group.key,
          label: t(`group.${group.key}`),
          rows: group.items.map(resultRow),
        })
      }
    }

    // Quick actions: all of them on an empty query, filtered by name while typing.
    const act = (title: string, icon: LucideIcon, run: () => void, id: string): Row => {
      const Icon = icon
      return {
        id: `action:${id}`,
        kind: 'action',
        title,
        icon: (
          <span className={tile}>
            <Icon className="h-4 w-4" />
          </span>
        ),
        onSelect: run,
      }
    }
    const create = (kind: CreateKind, label: string, icon: LucideIcon) =>
      act(label, icon, () => finish(() => onCreate(kind)), `new-${kind}`)
    const nav = (id: string, label: string, icon: LucideIcon, href: string) =>
      act(label, icon, () => finish(() => router.push(href)), `go-${id}`)

    const createRows = [
      create('task', t('newTask'), CheckSquare),
      create('project', t('newProject'), FolderKanban),
      create('note', t('newNote'), FileText),
    ]
    const navRows = [
      nav('home', tNav('home'), Home, '/dashboard'),
      nav('projects', tNav('projects'), FolderKanban, '/dashboard/projects'),
      nav('tasks', tNav('tasks'), CheckSquare, '/dashboard/tasks'),
      nav('plans', tNav('plan'), Target, '/dashboard/plans'),
      nav('notes', tNav('notes'), FileText, '/dashboard/notes'),
      nav('people', tNav('people'), Users, '/dashboard/team'),
      nav('finance', tNav('finance'), Wallet, '/dashboard/finance'),
      nav('reports', tNav('reports'), BarChart3, '/dashboard/reports'),
      nav('settings', tNav('settings'), Settings, '/dashboard/settings'),
    ]
    const match = (rows: Row[], extra: (row: Row) => string = (row) => row.title) =>
      needle ? rows.filter((row) => extra(row).toLowerCase().includes(needle)) : rows
    const createMatch = match(createRows)
    const navMatch = match(navRows, (row) => `${t('goTo')} ${row.title}`)

    if (createMatch.length > 0) {
      out.push({ key: 'create', label: t('quickActions'), rows: createMatch })
    }
    if (navMatch.length > 0) {
      out.push({ key: 'nav', label: t('goTo'), rows: navMatch })
    }
    return out
  }, [finish, onCreate, recent, resultRow, router, search.active, search.groups, t, tNav, trimmed])

  const flat = useMemo(() => sections.flatMap((section) => section.rows), [sections])
  const sectionStarts = useMemo(() => {
    const starts: number[] = []
    let offset = 0
    for (const section of sections) {
      starts.push(offset)
      offset += section.rows.length
    }
    return starts
  }, [sections])

  // Keep the cursor on a valid row, and on the first row when results change.
  const signature = useMemo(() => flat.map((row) => row.id).join('|'), [flat])
  useEffect(() => setActive(0), [signature])

  useEffect(() => {
    if (!viaKeyboard.current) return
    viaKeyboard.current = false
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, listId])

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    const count = flat.length
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (count) {
          viaKeyboard.current = true
          setActive((value) => (value + 1) % count)
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (count) {
          viaKeyboard.current = true
          setActive((value) => (value - 1 + count) % count)
        }
        break
      case 'Enter':
        event.preventDefault()
        flat[active]?.onSelect()
        break
      case 'Tab': {
        // Jump between groups; the input keeps focus.
        event.preventDefault()
        if (sections.length < 2) break
        let current = 0
        for (let i = 0; i < sectionStarts.length; i++) if (active >= sectionStarts[i]) current = i
        const next = (current + (event.shiftKey ? -1 : 1) + sections.length) % sections.length
        viaKeyboard.current = true
        setActive(sectionStarts[next])
        break
      }
      default:
    }
  }

  if (!open || !mounted) return null

  // ---- states --------------------------------------------------------------------------------

  const tooShort = trimmed.length > 0 && [...trimmed].length < MIN_QUERY_LENGTH
  const pending = search.active && !search.error && (search.loading || search.settledQuery !== trimmed)
  const showSkeleton = pending && search.groups.length === 0
  const noResults = search.active && !pending && !search.error && search.groups.length === 0
  const status = !workspaceId
    ? t('needWorkspace')
    : search.error
      ? t('error')
      : pending
        ? t('searching')
        : search.active
          ? t('resultCount', { count: search.groups.reduce((sum, group) => sum + group.items.length, 0) })
          : ''

  let rowIndex = -1

  return createPortal(
    <div
      className="fixed inset-0 z-[80] animate-fade-in bg-[rgb(var(--rgb-overlay)/0.55)] backdrop-blur-[2px] sm:flex sm:items-start sm:justify-center sm:px-6 sm:pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        className="flex h-[100dvh] w-full animate-dialog-in flex-col overflow-hidden bg-surface text-text-primary shadow-xl sm:h-auto sm:max-h-[min(72dvh,640px)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-border"
      >
        {/* Input, pinned on top */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:pt-2">
          <Search aria-hidden className="h-5 w-5 shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={flat.length > 0 ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            aria-label={t('inputLabel')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={t('placeholder')}
            enterKeyHint="search"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={80}
            className="h-12 min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-base text-text-primary outline-none placeholder:text-text-muted focus:ring-0 focus-visible:outline-none sm:text-[15px]"
          />
          {query ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label={t('clear')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-8 sm:w-8"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            tabIndex={-1}
            onClick={onClose}
            className="h-10 shrink-0 rounded-lg px-1 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:hidden"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={onClose}
            aria-label={t('close')}
            className="hidden shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:inline-flex"
          >
            <Kbd>Esc</Kbd>
          </button>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>

        {/* Results */}
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t('results')}
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          {!workspaceId ? (
            <Message icon={<Search className="h-5 w-5" />} title={t('needWorkspace')} />
          ) : null}

          {workspaceId && tooShort ? (
            <p className="px-3 py-2 text-sm text-text-muted">{t('minChars', { count: MIN_QUERY_LENGTH })}</p>
          ) : null}

          {workspaceId && search.error ? (
            <div className="mx-1 mb-2 flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
              <span className="min-w-0 flex-1 text-danger">{t('error')}</span>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={search.retry}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('retry')}
              </button>
            </div>
          ) : null}

          {workspaceId && showSkeleton ? <SkeletonRows label={t('searching')} /> : null}

          {workspaceId && noResults ? (
            <Message
              icon={<SearchX className="h-5 w-5" />}
              title={t('noResults', { query: trimmed })}
              hint={t('noResultsHint')}
            />
          ) : null}

          {workspaceId
            ? sections.map((section, sectionIndex) => (
                <div
                  key={section.key}
                  role="group"
                  aria-label={section.label}
                  className={`${sectionIndex > 0 ? 'mt-1' : ''} ${pending && search.groups.length > 0 && section.key !== 'create' && section.key !== 'nav' ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between px-3 pb-1 pt-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{section.label}</span>
                    {section.headerAction ? (
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={section.headerAction.onClick}
                        className="rounded-md px-1.5 py-0.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {section.headerAction.label}
                      </button>
                    ) : null}
                  </div>
                  {section.rows.map((row) => {
                    rowIndex += 1
                    const index = rowIndex
                    const selected = index === active
                    return (
                      <div
                        key={row.id}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={selected}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseMove={() => {
                          if (!selected) setActive(index)
                        }}
                        onClick={row.onSelect}
                        className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl px-3 py-2 sm:min-h-[44px] ${
                          selected ? 'bg-primary/10' : ''
                        }`}
                      >
                        {row.icon}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-text-primary">
                            {row.highlight ? <Highlight text={row.title} query={trimmed} /> : row.title}
                          </span>
                          {row.subtitle ? (
                            <span className="block truncate text-xs text-text-muted">
                              {row.highlight ? <Highlight text={row.subtitle} query={trimmed} /> : row.subtitle}
                            </span>
                          ) : null}
                        </span>
                        {row.trailing}
                        {selected ? (
                          <CornerDownLeft aria-hidden className="hidden h-3.5 w-3.5 shrink-0 text-text-muted sm:block" />
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))
            : null}
        </div>

        {/* Keyboard hints (desktop only) */}
        <div className="hidden shrink-0 items-center gap-4 border-t border-border bg-surface px-4 py-2 text-xs text-text-muted sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            {t('hintNavigate')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            {t('hintOpen')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Kbd>Tab</Kbd>
            {t('hintGroups')}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <Kbd>Esc</Kbd>
            {t('hintClose')}
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}

function Message({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-text-muted">{icon}</span>
      <p className="max-w-full break-words text-sm font-medium text-text-primary">{title}</p>
      {hint ? <p className="mt-1 text-sm text-text-muted">{hint}</p> : null}
    </div>
  )
}

function SkeletonRows({ label }: { label: string }) {
  return (
    <div aria-hidden className="space-y-1 px-1" data-label={label}>
      <div className="px-2 pb-1 pt-2">
        <div className="skeleton h-3 w-16 rounded" />
      </div>
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="flex min-h-[48px] items-center gap-3 rounded-xl px-2 py-2">
          <div className="skeleton h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="skeleton h-3.5 rounded" style={{ width: `${70 - item * 8}%` }} />
            <div className="skeleton h-3 w-2/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
