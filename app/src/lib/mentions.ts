/**
 * @mention helpers for comments (pure, used by the composer, the renderer and the API route).
 *
 * A mention is `@handle`, where the handle is the member's username with whitespace turned into
 * "_" and any other odd character removed (so "Ana Petrova" is `@Ana_Petrova`). Comments are stored
 * and rendered as plain text; mentions are recognised when rendering, never injected as markup.
 */

export interface MentionMember {
  id: string
  username: string
}

export type CommentToken =
  | { type: 'text'; text: string }
  | { type: 'mention'; text: string; handle: string; userId: string | null }

const HANDLE_CHAR = '[\\p{L}\\p{N}._-]'

/** `@handle` that is not glued to a word (so e-mail addresses are ignored). */
function mentionRegex(): RegExp {
  return new RegExp(`(^|[^\\p{L}\\p{N}_@.])@([\\p{L}\\p{N}]${HANDLE_CHAR}*)`, 'gu')
}

/** The text a member is mentioned with. Empty when the username has nothing mentionable. */
export function mentionHandle(username: string | null | undefined): string {
  return String(username ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}._-]/gu, '')
    .replace(/^[._-]+/, '')
}

/** Stored comments escape a stray "<" as "&lt;" (sanitizer); show it as typed. */
export function decodeStoredComment(content: string): string {
  return String(content ?? '').replace(/&lt;/g, '<')
}

function trimmedName(raw: string): string {
  return raw.replace(/[._-]+$/, '')
}

/** Unique @handles found in a comment (without the "@"), at most `limit`. */
export function extractMentionNames(content: string, limit = 20): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const re = mentionRegex()
  let m: RegExpExecArray | null
  while ((m = re.exec(String(content ?? '')))) {
    const name = trimmedName(m[2])
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length >= limit) break
  }
  return out
}

/** Maps lower-cased handle -> member id (first member wins on a collision). */
export function buildHandleIndex(members: MentionMember[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const member of members) {
    const handle = mentionHandle(member.username).toLowerCase()
    if (handle && !index.has(handle)) index.set(handle, member.id)
  }
  return index
}

/** User ids mentioned in `content` (only members of `members`). */
export function resolveMentionedIds(content: string, members: MentionMember[]): string[] {
  const index = buildHandleIndex(members)
  const ids = new Set<string>()
  for (const name of extractMentionNames(content)) {
    const id = index.get(name.toLowerCase())
    if (id) ids.add(id)
  }
  return Array.from(ids)
}

/**
 * Splits a comment into text and mention tokens. With `members`, only handles that belong to a
 * member become mentions (everything else stays text); without it every `@handle` is a mention.
 */
export function tokenizeComment(content: string, members?: MentionMember[]): CommentToken[] {
  const text = decodeStoredComment(content)
  const index = members ? buildHandleIndex(members) : null
  const tokens: CommentToken[] = []
  let cursor = 0
  const push = (value: string) => {
    if (!value) return
    const last = tokens[tokens.length - 1]
    if (last && last.type === 'text') last.text += value
    else tokens.push({ type: 'text', text: value })
  }

  const re = mentionRegex()
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const lead = m[1]
    const name = trimmedName(m[2])
    const start = m.index + lead.length
    const end = start + 1 + name.length
    const userId = index ? index.get(name.toLowerCase()) ?? null : null
    if (!name || (index && !userId)) continue
    push(text.slice(cursor, start))
    tokens.push({ type: 'mention', text: text.slice(start, end), handle: name, userId })
    cursor = end
    re.lastIndex = end
  }
  push(text.slice(cursor))
  return tokens
}

export interface MentionQuery {
  /** index of the "@" */
  start: number
  /** text typed after the "@" (up to the caret) */
  query: string
}

/** The mention being typed at the caret, or null when the caret is not inside one. */
export function getMentionQuery(text: string, caret: number): MentionQuery | null {
  if (caret < 0 || caret > text.length) return null
  const before = text.slice(0, caret)
  const m = new RegExp(`(^|[^\\p{L}\\p{N}_@.])@(${HANDLE_CHAR}{0,40})$`, 'u').exec(before)
  if (!m) return null
  return { start: before.length - m[2].length - 1, query: m[2] }
}

/** Replaces the typed `@query` with `@handle ` and returns the new text and caret position. */
export function applyMention(text: string, caret: number, start: number, handle: string): { text: string; caret: number } {
  const after = text.slice(caret)
  const insert = `@${handle}${/^\s/.test(after) ? '' : ' '}`
  const next = text.slice(0, start) + insert + after
  const nextCaret = start + insert.length + (/^\s/.test(after) ? 1 : 0)
  return { text: next, caret: Math.min(nextCaret, next.length) }
}

/** Members matching what was typed after "@": prefix matches first, then substring matches. */
export function filterMentionMembers<T extends MentionMember>(members: T[], query: string, limit = 6): T[] {
  const needle = query.trim().toLowerCase()
  const scored: Array<{ member: T; rank: number }> = []
  for (const member of members) {
    const handle = mentionHandle(member.username)
    if (!handle) continue
    const hay = handle.toLowerCase()
    const name = member.username.toLowerCase()
    let rank = -1
    if (!needle) rank = 1
    else if (hay.startsWith(needle) || name.startsWith(needle)) rank = 0
    else if (hay.includes(needle) || name.includes(needle)) rank = 1
    if (rank >= 0) scored.push({ member, rank })
  }
  scored.sort((a, b) => a.rank - b.rank || a.member.username.localeCompare(b.member.username))
  return scored.slice(0, limit).map((s) => s.member)
}
