import { describe, expect, it } from 'vitest'
import {
  applyMention,
  buildHandleIndex,
  decodeStoredComment,
  extractMentionNames,
  filterMentionMembers,
  getMentionQuery,
  mentionHandle,
  resolveMentionedIds,
  tokenizeComment,
} from './mentions'

const members = [
  { id: 'u1', username: 'ana' },
  { id: 'u2', username: 'Mile Stoev' },
  { id: 'u3', username: 'Марија' },
  { id: 'u4', username: '!!!' },
]

describe('mentionHandle', () => {
  it('turns spaces into underscores and drops odd characters', () => {
    expect(mentionHandle('Mile Stoev')).toBe('Mile_Stoev')
    expect(mentionHandle('  jo@hn+x ')).toBe('johnx')
    expect(mentionHandle('Марија')).toBe('Марија')
    expect(mentionHandle('!!!')).toBe('')
    expect(mentionHandle(null)).toBe('')
  })
})

describe('extractMentionNames', () => {
  it('finds unique handles and trims trailing punctuation', () => {
    expect(extractMentionNames('hi @ana, and @Mile_Stoev. also @ana again')).toEqual(['ana', 'Mile_Stoev'])
  })
  it('ignores e-mail addresses and lone @', () => {
    expect(extractMentionNames('mail me at bob@example.com or @ later')).toEqual([])
  })
  it('supports Cyrillic', () => {
    expect(extractMentionNames('здраво @Марија!')).toEqual(['Марија'])
  })
  it('caps the number of handles', () => {
    const text = Array.from({ length: 30 }, (_, i) => `@u${i}`).join(' ')
    expect(extractMentionNames(text, 5)).toHaveLength(5)
  })
})

describe('resolveMentionedIds', () => {
  it('maps handles to member ids case-insensitively and skips strangers', () => {
    expect(resolveMentionedIds('@ANA @mile_stoev @nobody', members).sort()).toEqual(['u1', 'u2'])
  })
})

describe('buildHandleIndex', () => {
  it('skips members without a mentionable handle and keeps the first on collisions', () => {
    const index = buildHandleIndex([...members, { id: 'u9', username: 'ANA' }])
    expect(index.has('')).toBe(false)
    expect(index.get('ana')).toBe('u1')
  })
})

describe('tokenizeComment', () => {
  it('splits text and member mentions, leaving the trailing punctuation as text', () => {
    expect(tokenizeComment('Hey @ana, see @Mile_Stoev.', members)).toEqual([
      { type: 'text', text: 'Hey ' },
      { type: 'mention', text: '@ana', handle: 'ana', userId: 'u1' },
      { type: 'text', text: ', see ' },
      { type: 'mention', text: '@Mile_Stoev', handle: 'Mile_Stoev', userId: 'u2' },
      { type: 'text', text: '.' },
    ])
  })
  it('keeps unknown handles as plain text when members are given', () => {
    expect(tokenizeComment('ping @ghost now', members)).toEqual([{ type: 'text', text: 'ping @ghost now' }])
  })
  it('treats every handle as a mention without a member list', () => {
    const tokens = tokenizeComment('@ghost')
    expect(tokens).toEqual([{ type: 'mention', text: '@ghost', handle: 'ghost', userId: null }])
  })
  it('never produces markup: html stays text', () => {
    const tokens = tokenizeComment('<img src=x onerror=alert(1)> @ana', members)
    expect(tokens[0]).toEqual({ type: 'text', text: '<img src=x onerror=alert(1)> ' })
  })
  it('decodes the escaped "<" the sanitizer stores', () => {
    expect(decodeStoredComment('a &lt;b')).toBe('a <b')
    expect(tokenizeComment('1 &lt; 2', members)).toEqual([{ type: 'text', text: '1 < 2' }])
  })
  it('returns no tokens for empty content', () => {
    expect(tokenizeComment('', members)).toEqual([])
  })
})

describe('getMentionQuery', () => {
  it('detects a mention being typed at the caret', () => {
    expect(getMentionQuery('hello @an', 9)).toEqual({ start: 6, query: 'an' })
    expect(getMentionQuery('@', 1)).toEqual({ start: 0, query: '' })
    expect(getMentionQuery('a\n@x', 4)).toEqual({ start: 2, query: 'x' })
  })
  it('is null outside a mention', () => {
    expect(getMentionQuery('hello world', 11)).toBeNull()
    expect(getMentionQuery('mail bob@exa', 12)).toBeNull()
    expect(getMentionQuery('hello @ana there', 16)).toBeNull()
  })
  it('only looks left of the caret', () => {
    expect(getMentionQuery('hi @ana', 4)).toEqual({ start: 3, query: '' })
  })
})

describe('applyMention', () => {
  it('replaces the typed query and adds a trailing space', () => {
    expect(applyMention('hello @an', 9, 6, 'ana')).toEqual({ text: 'hello @ana ', caret: 11 })
  })
  it('does not double the space before existing text', () => {
    expect(applyMention('hi @a there', 5, 3, 'ana')).toEqual({ text: 'hi @ana there', caret: 8 })
  })
})

describe('filterMentionMembers', () => {
  it('puts prefix matches first and hides unmentionable members', () => {
    const list = [
      { id: '1', username: 'Bianca' },
      { id: '2', username: 'Ana' },
      { id: '3', username: 'Nana' },
      { id: '4', username: '???' },
    ]
    expect(filterMentionMembers(list, 'an').map((m) => m.id)).toEqual(['2', '1', '3'])
    expect(filterMentionMembers(list, '').map((m) => m.id)).not.toContain('4')
  })
  it('matches the display name with spaces', () => {
    expect(filterMentionMembers(members, 'mile s').map((m) => m.id)).toEqual(['u2'])
  })
  it('respects the limit', () => {
    expect(filterMentionMembers(members, '', 2)).toHaveLength(2)
  })
})
