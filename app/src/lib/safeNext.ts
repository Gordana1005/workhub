/**
 * Validates a post-auth `next` redirect target. Only same-origin relative paths are allowed:
 * must start with a single '/', no '//' or backslash tricks, no control characters.
 */
export function safeNextPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || typeof value !== 'string') return fallback
  if (value.length > 2048) return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback
  return value
}
