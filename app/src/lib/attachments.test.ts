import { describe, expect, it } from 'vitest'
import {
  MAX_ATTACHMENT_BYTES,
  buildStoragePath,
  cleanDisplayName,
  extensionOf,
  fileKind,
  formatBytes,
  isMissingBucketError,
  isMissingSchemaError,
  isPreviewableImage,
  isTaskStoragePath,
  pastedImageName,
  sanitizeFileName,
  validateAttachment,
} from './attachments'

describe('validateAttachment', () => {
  it('accepts normal files', () => {
    expect(validateAttachment({ name: 'spec.pdf', size: 1000, type: 'application/pdf' })).toBeNull()
    expect(validateAttachment({ name: 'shot.PNG', size: MAX_ATTACHMENT_BYTES, type: 'image/png' })).toBeNull()
    expect(validateAttachment({ name: 'a.zip', size: 5, type: '' })).toBeNull()
  })
  it('rejects empty and oversized files', () => {
    expect(validateAttachment({ name: 'a.pdf', size: 0 })).toBe('empty')
    expect(validateAttachment({ name: 'a.pdf', size: NaN })).toBe('empty')
    expect(validateAttachment({ name: 'a.pdf', size: MAX_ATTACHMENT_BYTES + 1 })).toBe('tooLarge')
  })
  it('rejects unsupported and script-carrying types', () => {
    expect(validateAttachment({ name: 'run.exe', size: 10 })).toBe('unsupported')
    expect(validateAttachment({ name: 'noext', size: 10 })).toBe('unsupported')
    expect(validateAttachment({ name: 'logo.svg', size: 10, type: 'image/svg+xml' })).toBe('unsupported')
    expect(validateAttachment({ name: 'page.txt', size: 10, type: 'text/html' })).toBe('unsupported')
  })
  it('honours a custom limit', () => {
    expect(validateAttachment({ name: 'a.pdf', size: 11 }, 10)).toBe('tooLarge')
  })
})

describe('fileKind', () => {
  it('classifies by extension first, then mime', () => {
    expect(fileKind('a.JPG')).toBe('image')
    expect(fileKind('a.docx')).toBe('document')
    expect(fileKind('a.xlsx')).toBe('spreadsheet')
    expect(fileKind('a.pptx')).toBe('presentation')
    expect(fileKind('a.zip')).toBe('archive')
    expect(fileKind('notes.md')).toBe('text')
    expect(fileKind('blob', 'image/png')).toBe('image')
    expect(fileKind('blob', 'application/pdf')).toBe('pdf')
    expect(fileKind('blob')).toBe('other')
  })
  it('previews raster images only', () => {
    expect(isPreviewableImage('a.png', 'image/png')).toBe(true)
    expect(isPreviewableImage('a.heic', 'image/heic')).toBe(false)
    expect(isPreviewableImage('a.pdf', 'application/pdf')).toBe(false)
    expect(isPreviewableImage('a.svg', 'image/svg+xml')).toBe(false)
  })
})

describe('extensionOf', () => {
  it('handles dots, case and paths', () => {
    expect(extensionOf('archive.tar.GZ')).toBe('gz')
    expect(extensionOf('.hidden')).toBe('')
    expect(extensionOf('dir.d/file')).toBe('')
    expect(extensionOf('C:\\x\\a.pdf')).toBe('pdf')
    expect(extensionOf('trailing.')).toBe('')
  })
})

describe('sanitizeFileName', () => {
  it('keeps safe names and extensions', () => {
    expect(sanitizeFileName('report-final_v2.pdf')).toBe('report-final_v2.pdf')
  })
  it('strips paths and traversal', () => {
    expect(sanitizeFileName('../../etc/passwd.txt')).toBe('passwd.txt')
    expect(sanitizeFileName('C:\\Users\\me\\a b.pdf')).toBe('a_b.pdf')
    expect(sanitizeFileName('..')).toBe('file')
  })
  it('transliterates accents and replaces non-latin characters', () => {
    expect(sanitizeFileName('café menu.pdf')).toBe('cafe_menu.pdf')
    expect(sanitizeFileName('Договор.pdf')).toBe('file.pdf')
  })
  it('limits the length but keeps the extension', () => {
    const name = sanitizeFileName(`${'a'.repeat(300)}.docx`)
    expect(name.endsWith('.docx')).toBe(true)
    expect(name.length).toBeLessThanOrEqual(86)
  })
  it('never leaves unsafe characters', () => {
    expect(sanitizeFileName('a<b>|"c\u0000?.png')).toMatch(/^[A-Za-z0-9._-]+$/)
    expect(sanitizeFileName('')).toBe('file')
  })
})

describe('cleanDisplayName', () => {
  it('removes paths and control characters but keeps unicode', () => {
    expect(cleanDisplayName('C:\\fakepath\\Договор  1.pdf')).toBe('Договор 1.pdf')
    expect(cleanDisplayName('a\u0000b\n.txt')).toBe('ab.txt')
    expect(cleanDisplayName('')).toBe('file')
    expect(cleanDisplayName('..')).toBe('file')
  })
  it('bounds the length keeping the extension', () => {
    const name = cleanDisplayName(`${'x'.repeat(400)}.pdf`)
    expect(name.length).toBe(180)
    expect(name.endsWith('.pdf')).toBe(true)
  })
})

describe('storage paths', () => {
  const ws = '11111111-1111-4111-8111-111111111111'
  const task = '22222222-2222-4222-8222-222222222222'
  const uid = '33333333-3333-4333-8333-333333333333'

  it('builds and recognises its own paths', () => {
    const path = buildStoragePath(ws, task, uid, 'My file.PDF')
    expect(path).toBe(`${ws}/${task}/${uid}-My_file.pdf`)
    expect(isTaskStoragePath(path, ws, task)).toBe(true)
  })
  it('rejects paths of another workspace/task, traversal and junk', () => {
    const path = buildStoragePath(ws, task, uid, 'a.pdf')
    expect(isTaskStoragePath(path, ws, uid)).toBe(false)
    expect(isTaskStoragePath(path, task, task)).toBe(false)
    expect(isTaskStoragePath(`${ws}/${task}/../x/${uid}-a.pdf`, ws, task)).toBe(false)
    expect(isTaskStoragePath(`${ws}/${task}/not-a-uuid-a.pdf`, ws, task)).toBe(false)
    expect(isTaskStoragePath(`${ws}/${task}/${uid}-a/b.pdf`, ws, task)).toBe(false)
  })
})

describe('formatBytes', () => {
  it('formats sizes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(null)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(10 * 1024 * 1024)).toBe('10 MB')
  })
})

describe('pastedImageName', () => {
  it('builds a timestamped name with the right extension', () => {
    const at = new Date(2026, 0, 5, 9, 3, 7)
    expect(pastedImageName('image/png', at)).toBe('pasted-image-20260105-090307.png')
    expect(pastedImageName('image/jpeg', at)).toBe('pasted-image-20260105-090307.jpg')
  })
})

describe('error classifiers', () => {
  it('recognises missing schema errors', () => {
    expect(isMissingSchemaError({ code: '42P01' })).toBe(true)
    expect(isMissingSchemaError({ code: 'PGRST205' })).toBe(true)
    expect(isMissingSchemaError({ code: '42703' })).toBe(true)
    expect(isMissingSchemaError({ message: "Could not find the table 'public.x' in the schema cache" })).toBe(true)
    expect(isMissingSchemaError({ code: '23505', message: 'duplicate' })).toBe(false)
    expect(isMissingSchemaError(null)).toBe(false)
  })
  it('recognises a missing bucket', () => {
    expect(isMissingBucketError({ message: 'Bucket not found' })).toBe(true)
    expect(isMissingBucketError({ message: 'Object not found' })).toBe(false)
  })
})
