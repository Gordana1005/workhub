'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type SearchResultType = 'task' | 'project' | 'note' | 'plan' | 'milestone' | 'person' | 'comment'
export type SearchGroupKey = 'tasks' | 'projects' | 'notes' | 'plans' | 'people' | 'comments'

export interface SearchResult {
  type: SearchResultType
  id: string
  title: string
  subtitle: string
  href: string
  meta: Record<string, unknown>
}

export interface SearchGroup {
  key: SearchGroupKey
  items: SearchResult[]
}

export const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 200

interface SearchState {
  groups: SearchGroup[]
  loading: boolean
  error: boolean
  /** The query the current `groups` belong to (so the UI never shows stale rows as fresh). */
  settledQuery: string
}

/**
 * Debounced global search. Aborts the in-flight request whenever the query changes, so a slow
 * response for "ab" can never overwrite the results for "abc".
 */
export function useSearch(query: string, workspaceId: string | undefined, enabled: boolean) {
  const [state, setState] = useState<SearchState>({ groups: [], loading: false, error: false, settledQuery: '' })
  const [attempt, setAttempt] = useState(0)
  const trimmed = query.trim()
  const active = enabled && Boolean(workspaceId) && [...trimmed].length >= MIN_QUERY_LENGTH

  useEffect(() => {
    if (!active) {
      setState((prev) => (prev.loading || prev.error || prev.groups.length ? { groups: [], loading: false, error: false, settledQuery: '' } : prev))
      return
    }

    const controller = new AbortController()
    setState((prev) => ({ ...prev, loading: true, error: false }))

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmed, workspace_id: workspaceId as string, limit: '6' })
        const response = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error(`search ${response.status}`)
        const data = (await response.json()) as { groups?: SearchGroup[] }
        setState({ groups: Array.isArray(data.groups) ? data.groups : [], loading: false, error: false, settledQuery: trimmed })
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return
        setState((prev) => ({ ...prev, loading: false, error: true }))
      }
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [active, trimmed, workspaceId, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  return { ...state, active, retry }
}

// ---- recent searches (localStorage, always inside try/catch) -------------------------------

const RECENT_KEY = 'trackwork-recent-searches'
const RECENT_MAX = 6

export function loadRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

function saveRecent(items: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(items))
  } catch {
    // storage unavailable: recents just are not remembered
  }
}

export function pushRecent(query: string): string[] {
  const value = query.trim()
  if ([...value].length < MIN_QUERY_LENGTH) return loadRecent()
  const next = [value, ...loadRecent().filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, RECENT_MAX)
  saveRecent(next)
  return next
}

export function removeRecent(query: string): string[] {
  const next = loadRecent().filter((item) => item !== query)
  saveRecent(next)
  return next
}

export function clearRecent(): string[] {
  saveRecent([])
  return []
}

/** Stable ref wrapper so callbacks passed to window listeners never go stale. */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}
