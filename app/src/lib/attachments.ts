/**
 * Pure helpers for task attachments, shared by the browser (validation before upload, icons, sizes)
 * and the API routes (the same rules are enforced again on the server).
 */

export const ATTACHMENTS_BUCKET = 'attachments'

/** Hard per-file limit (the storage bucket enforces the same number, see migration 027). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

export type FileKind = 'image' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'archive' | 'text' | 'other'

const KIND_BY_EXTENSION: Record<string, FileKind> = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  avif: 'image',
  bmp: 'image',
  heic: 'image',
  heif: 'image',
  pdf: 'pdf',
  doc: 'document',
  docx: 'document',
  odt: 'document',
  rtf: 'document',
  pages: 'document',
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  ods: 'spreadsheet',
  csv: 'spreadsheet',
  numbers: 'spreadsheet',
  ppt: 'presentation',
  pptx: 'presentation',
  odp: 'presentation',
  key: 'presentation',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  gz: 'archive',
  tar: 'archive',
  txt: 'text',
  md: 'text',
  json: 'text',
  log: 'text',
}

/** Content types that must never be stored, whatever the extension says (script/markup carriers). */
const BLOCKED_MIME = /^(text\/html|application\/xhtml|image\/svg|text\/javascript|application\/javascript|application\/x-msdownload|application\/x-sh)/i

export const ACCEPT_ATTRIBUTE = Object.keys(KIND_BY_EXTENSION)
  .map((ext) => `.${ext}`)
  .join(',')

export function extensionOf(name: string): string {
  const base = baseName(name)
  const dot = base.lastIndexOf('.')
  return dot > 0 && dot < base.length - 1 ? base.slice(dot + 1).toLowerCase() : ''
}

function baseName(name: string): string {
  return String(name ?? '').split(/[\\/]/).pop() ?? ''
}

export function fileKind(name: string, type?: string | null): FileKind {
  const byExtension = KIND_BY_EXTENSION[extensionOf(name)]
  if (byExtension) return byExtension
  const mime = (type || '').toLowerCase()
  if (mime.startsWith('image/') && !BLOCKED_MIME.test(mime)) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  return 'other'
}

/** Images the browser can show in an <img> (HEIC is not rendered by most browsers). */
export function isPreviewableImage(name: string, type?: string | null): boolean {
  const ext = extensionOf(name)
  if (ext === 'heic' || ext === 'heif') return false
  return fileKind(name, type) === 'image'
}

export type AttachmentProblem = 'empty' | 'tooLarge' | 'unsupported'

export interface FileLike {
  name: string
  size: number
  type?: string | null
}

/** Returns why a file can not be attached, or null when it is fine. */
export function validateAttachment(file: FileLike, maxBytes = MAX_ATTACHMENT_BYTES): AttachmentProblem | null {
  if (!file || !Number.isFinite(file.size) || file.size <= 0) return 'empty'
  if (file.size > maxBytes) return 'tooLarge'
  if (!(extensionOf(file.name) in KIND_BY_EXTENSION)) return 'unsupported'
  if (file.type && BLOCKED_MIME.test(file.type)) return 'unsupported'
  return null
}

/** Name shown in the UI: no path, no control characters, bounded length. */
export function cleanDisplayName(name: string, fallback = 'file'): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = baseName(name).replace(/[\u0000-\u001f\u007f]+/g, '').replace(/\s+/g, ' ').trim()
  if (!cleaned || cleaned === '.' || cleaned === '..') return fallback
  if (cleaned.length <= 180) return cleaned
  const ext = extensionOf(cleaned)
  const suffix = ext ? `.${ext}` : ''
  return `${cleaned.slice(0, 180 - suffix.length)}${suffix}`
}

/** Name used inside a storage key: ASCII only, no separators / traversal, bounded length, extension kept. */
export function sanitizeFileName(name: string): string {
  const base = baseName(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
  const ext = extensionOf(base).replace(/[^a-z0-9]/g, '').slice(0, 10)
  const stem = (ext ? base.slice(0, base.length - ext.length - 1) : base)
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+/, '')
    .replace(/[._-]+$/, '')
    .slice(0, 80)
  const safeStem = stem || 'file'
  return ext ? `${safeStem}.${ext}` : safeStem
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

export function buildStoragePath(workspaceId: string, taskId: string, uniqueId: string, name: string): string {
  return `${workspaceId}/${taskId}/${uniqueId}-${sanitizeFileName(name)}`
}

/** True when `path` has exactly the shape `buildStoragePath` produces for this workspace and task. */
export function isTaskStoragePath(path: string, workspaceId: string, taskId: string): boolean {
  if (typeof path !== 'string' || path.length > 400) return false
  const prefix = `${workspaceId}/${taskId}/`
  if (!path.startsWith(prefix)) return false
  return new RegExp(`^${UUID}-[A-Za-z0-9._-]{1,100}$`, 'i').test(path.slice(prefix.length))
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, i)
  return `${i === 0 ? Math.round(value) : value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`
}

/** Name for an image pasted from the clipboard (browsers call every one "image.png"). */
export function pastedImageName(type: string, at: Date = new Date()): string {
  const ext = type === 'image/jpeg' ? 'jpg' : (type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png'
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`
  return `pasted-image-${stamp}.${ext}`
}

/** Postgres / PostgREST / storage errors that mean "this feature is not set up in the database yet". */
export function isMissingSchemaError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null | undefined
  if (!e) return false
  const code = e.code || ''
  if (code === '42P01' || code === 'PGRST205' || code === '42703' || code === 'PGRST204') return true
  return /could not find the table|does not exist|schema cache/i.test(e.message || '')
}

export function isMissingBucketError(error: unknown): boolean {
  const e = error as { message?: string } | null | undefined
  return !!e && /bucket not found/i.test(e.message || '')
}
