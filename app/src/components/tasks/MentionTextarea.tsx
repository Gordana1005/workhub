'use client'

/**
 * MentionTextarea: auto-growing textarea with an @mention autocomplete.
 * Typing "@" (at the start of a word) opens a list of members above the field (phone friendly: rows are 48px,
 * the list stays above the composer and therefore above the on-screen keyboard). Arrow keys move, Enter / Tab
 * insert `@handle `, Esc closes. Plain Enter sends with a physical keyboard (newline on touch);
 * Ctrl/Cmd+Enter always sends. Pasting image files calls `onPasteFiles`.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar } from '@/components/ui/Avatar'
import { applyMention, filterMentionMembers, getMentionQuery, mentionHandle } from '@/lib/mentions'
import type { MemberOption } from './types'

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  members: MemberOption[]
  placeholder: string
  ariaLabel: string
  disabled?: boolean
  autoFocus?: boolean
  maxLength?: number
  className?: string
  /** Enter on a physical keyboard / Ctrl+Enter. */
  onSubmit?: () => void
  /** Escape while the mention list is closed. */
  onEscape?: () => void
  /** Called with pasted image files (the default paste is cancelled when this handles them). */
  onPasteFiles?: (files: File[]) => void
  onFocus?: React.FocusEventHandler<HTMLTextAreaElement>
}

const MAX_HEIGHT = 128

function isTouch() {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
}

export default function MentionTextarea({
  value,
  onChange,
  members,
  placeholder,
  ariaLabel,
  disabled,
  autoFocus,
  maxLength,
  className = '',
  onSubmit,
  onEscape,
  onPasteFiles,
  onFocus,
}: MentionTextareaProps) {
  const t = useTranslations('pages.tasks')
  const uid = useId()
  const ref = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const [caret, setCaret] = useState(0)
  const [active, setActive] = useState(0)
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)

  const mention = useMemo(() => getMentionQuery(value, caret), [value, caret])
  const candidates = useMemo(
    () => (mention ? filterMentionMembers(members, mention.query) : []),
    [members, mention]
  )
  const open = focused && !!mention && dismissedAt !== mention.start && !disabled && members.length > 0

  // keep the highlighted row valid while the query changes
  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(0, candidates.length - 1)))
  }, [candidates.length])

  useEffect(() => {
    setActive(0)
  }, [mention?.query, mention?.start])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  // auto-grow
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [value])

  // restore the caret after inserting a mention
  useLayoutEffect(() => {
    const el = ref.current
    if (el && pendingCaret.current !== null) {
      const position = pendingCaret.current
      pendingCaret.current = null
      el.setSelectionRange(position, position)
      setCaret(position)
    }
  }, [value])

  useEffect(() => {
    if (autoFocus) {
      const el = ref.current
      if (el) {
        el.focus({ preventScroll: true })
        el.setSelectionRange(el.value.length, el.value.length)
        setCaret(el.value.length)
      }
    }
  }, [autoFocus])

  const syncCaret = () => {
    const el = ref.current
    if (el) setCaret(el.selectionStart ?? el.value.length)
  }

  const choose = (member: MemberOption) => {
    const el = ref.current
    if (!mention || !el) return
    const result = applyMention(value, el.selectionStart ?? caret, mention.start, mentionHandle(member.username))
    pendingCaret.current = result.caret
    onChange(result.text)
    el.focus({ preventScroll: true })
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return

    if (open && candidates.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive((index) => (index + 1) % candidates.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((index) => (index - 1 + candidates.length) % candidates.length)
        return
      }
      if ((event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.shiftKey) || event.key === 'Tab') {
        event.preventDefault()
        choose(candidates[active] ?? candidates[0])
        return
      }
    }
    if (event.key === 'Escape') {
      if (open && mention) {
        event.preventDefault()
        event.stopPropagation()
        event.nativeEvent.stopImmediatePropagation()
        setDismissedAt(mention.start)
        return
      }
      if (onEscape) {
        event.preventDefault()
        event.stopPropagation()
        event.nativeEvent.stopImmediatePropagation()
        onEscape()
      }
      return
    }
    if (event.key === 'Enter' && !event.shiftKey && onSubmit) {
      // Ctrl/Cmd+Enter always sends; plain Enter sends with a physical keyboard (newline on touch)
      if (event.metaKey || event.ctrlKey || !isTouch()) {
        event.preventDefault()
        onSubmit()
      }
    }
  }

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onPasteFiles) return
    const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) return
    event.preventDefault()
    onPasteFiles(files)
  }

  const listId = `${uid}-mentions`

  return (
    <div className="relative min-w-0 flex-1">
      {open ? (
        <div
          className="absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-pop animate-pop-in"
          // keep focus (and the on-screen keyboard) in the textarea while tapping a row
          onMouseDown={(event) => event.preventDefault()}
        >
          <p className="border-b border-border px-3 py-1.5 text-xs font-medium text-text-muted">{t('commentMentionList')}</p>
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={t('commentMentionList')}
            className="scrollbar-thin max-h-56 overflow-y-auto overscroll-contain p-1"
          >
            {candidates.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-text-muted">{t('commentMentionNone')}</p>
            ) : (
              candidates.map((member, index) => (
                <div
                  key={member.id}
                  id={`${uid}-opt-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={index === active}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(member)}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 active:bg-tertiary sm:min-h-10 ${
                    index === active ? 'bg-surface-hover' : ''
                  }`}
                >
                  <Avatar src={member.avatar_url} alt={member.username} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-base font-medium text-text-primary sm:text-sm">
                    {member.username}
                  </span>
                  <span className="shrink-0 text-xs text-text-muted">@{mentionHandle(member.username)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
      <textarea
        ref={ref}
        rows={1}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && candidates.length ? `${uid}-opt-${active}` : undefined}
        onChange={(event) => {
          onChange(event.target.value)
          setCaret(event.target.selectionStart ?? event.target.value.length)
        }}
        onSelect={syncCaret}
        onKeyUp={syncCaret}
        onClick={syncCaret}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className={`max-h-32 min-h-[2.75rem] w-full resize-none rounded-xl border border-border bg-secondary px-3 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 sm:min-h-[2.5rem] sm:py-2 sm:text-sm ${className}`}
      />
    </div>
  )
}
