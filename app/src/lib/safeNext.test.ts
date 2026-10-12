import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safeNext'

describe('safeNextPath', () => {
  it('keeps same-origin relative paths (with query/hash)', () => {
    expect(safeNextPath('/dashboard/tasks')).toBe('/dashboard/tasks')
    expect(safeNextPath('/join?token=abc&x=1#top')).toBe('/join?token=abc&x=1#top')
  })

  it('falls back for empty / missing values', () => {
    expect(safeNextPath(null)).toBe('/dashboard')
    expect(safeNextPath(undefined)).toBe('/dashboard')
    expect(safeNextPath('')).toBe('/dashboard')
  })

  it('uses a custom fallback', () => {
    expect(safeNextPath('https://evil.com', '/home')).toBe('/home')
  })

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeNextPath('https://evil.com')).toBe('/dashboard')
    expect(safeNextPath('//evil.com')).toBe('/dashboard')
    expect(safeNextPath('javascript:alert(1)')).toBe('/dashboard')
    expect(safeNextPath('dashboard')).toBe('/dashboard')
  })

  it('rejects backslash and control-character tricks', () => {
    expect(safeNextPath('/\\evil.com')).toBe('/dashboard')
    expect(safeNextPath('/foo\\bar')).toBe('/dashboard')
    expect(safeNextPath('/foo\nbar')).toBe('/dashboard')
    expect(safeNextPath('/foo\tbar')).toBe('/dashboard')
  })

  it('rejects absurdly long values', () => {
    expect(safeNextPath('/' + 'a'.repeat(3000))).toBe('/dashboard')
  })
})
