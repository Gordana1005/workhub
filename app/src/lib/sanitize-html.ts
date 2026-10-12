/**
 * Tiny allow-list HTML sanitizer for rich-text (TipTap) content, applied on
 * WRITE in the API routes. It is a tokenizer, not a DOM parser, so it runs
 * anywhere (Node route handlers, tests) with no dependency.
 *
 * Rules:
 *  - only allow-listed tags survive; any other tag is dropped but its text stays
 *  - script/style/iframe/object/embed/... are dropped together with their content
 *  - only allow-listed attributes survive (never on* handlers, never style)
 *  - href/src must use a safe scheme (http, https, mailto, tel, relative, or an
 *    inline raster data:image for src)
 *  - comments are removed and a stray "<" that could start a tag is escaped
 */

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input'])

/** Tags removed together with everything inside them. */
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'noscript', 'template', 'svg', 'math', 'title', 'head', 'textarea', 'select',
  'option', 'form', 'button', 'link', 'meta', 'base',
])

const GLOBAL_ATTRS = new Set(['class', 'data-type', 'data-checked'])

const ALLOWED_TAGS: Record<string, Set<string>> = {
  p: new Set(),
  br: new Set(),
  hr: new Set(),
  h1: new Set(),
  h2: new Set(),
  h3: new Set(),
  h4: new Set(),
  h5: new Set(),
  h6: new Set(),
  ul: new Set(),
  ol: new Set(['start']),
  li: new Set(),
  strong: new Set(),
  b: new Set(),
  em: new Set(),
  i: new Set(),
  u: new Set(),
  s: new Set(),
  del: new Set(),
  mark: new Set(),
  code: new Set(),
  pre: new Set(),
  blockquote: new Set(),
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  span: new Set(),
  div: new Set(),
  // TipTap task items render a checkbox inside a label
  label: new Set(),
  input: new Set(['type', 'checked', 'disabled']),
}

const SAFE_DATA_TYPES = new Set(['taskList', 'taskItem'])

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", colon: ':', tab: '\t', newline: '\n',
  lpar: '(', rpar: ')', sol: '/', num: '#',
}

/** Decodes the entities a browser would decode inside an attribute value. */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);?/gi, (m, n) => NAMED_ENTITIES[String(n).toLowerCase()] ?? m)
}

function safeCodePoint(cp: number): string {
  if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return ''
  try {
    return String.fromCodePoint(cp)
  } catch {
    return ''
  }
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Returns true when `raw` is safe to use as an href/src.
 * `allowDataImage` additionally permits inline raster images (never SVG).
 */
export function isSafeUrl(raw: string, allowDataImage = false): boolean {
  // Browsers ignore whitespace/control characters inside the scheme
  // eslint-disable-next-line no-control-regex
  const value = decodeEntities(raw).replace(/[\u0000- \u007f-\u009f]+/g, '')
  if (!value) return false
  if (/^(https?:|mailto:|tel:)/i.test(value)) return true
  if (allowDataImage && /^data:image\/(png|jpe?g|gif|webp|avif|bmp);base64,[a-z0-9+/=]+$/i.test(value)) return true
  // Relative URL: no scheme at all (a ":" before any "/", "?" or "#" means a scheme)
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false
  return !value.startsWith('//') || /^\/\/[^/]/.test(value)
}

const TAG_RE =
  /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g

const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

function sanitizeAttributes(tag: string, rawAttrs: string): string {
  const allowedForTag = ALLOWED_TAGS[tag]
  const out: string[] = []
  const seen = new Set<string>()
  let hasTargetBlank = false

  ATTR_RE.lastIndex = 0
  let m: RegExpExecArray | null
  const attrs: Array<[string, string]> = []
  while ((m = ATTR_RE.exec(rawAttrs))) {
    attrs.push([m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? ''])
  }

  for (const [name, rawValue] of attrs) {
    if (seen.has(name)) continue
    if (!GLOBAL_ATTRS.has(name) && !allowedForTag.has(name)) continue
    const value = decodeEntities(rawValue)

    switch (name) {
      case 'class': {
        const cleaned = value.replace(/[^\w\s:-]/g, '').replace(/\s+/g, ' ').trim()
        if (!cleaned) continue
        out.push(`class="${escapeAttr(cleaned)}"`)
        break
      }
      case 'data-type':
        if (!SAFE_DATA_TYPES.has(value)) continue
        out.push(`data-type="${value}"`)
        break
      case 'data-checked':
        if (value !== 'true' && value !== 'false') continue
        out.push(`data-checked="${value}"`)
        break
      case 'href':
        if (!isSafeUrl(rawValue)) continue
        out.push(`href="${escapeAttr(value.trim())}"`)
        break
      case 'src':
        if (!isSafeUrl(rawValue, true)) continue
        out.push(`src="${escapeAttr(value.trim())}"`)
        break
      case 'target':
        if (value !== '_blank') continue
        hasTargetBlank = true
        out.push('target="_blank"')
        break
      case 'rel':
        continue // always regenerated below
      case 'width':
      case 'height':
      case 'start':
        if (!/^\d{1,5}$/.test(value.trim())) continue
        out.push(`${name}="${value.trim()}"`)
        break
      case 'type':
        // <input> may only ever be a checkbox (the tag is dropped otherwise)
        if (value.toLowerCase() !== 'checkbox') continue
        out.push('type="checkbox"')
        break
      case 'checked':
      case 'disabled':
        out.push(name)
        break
      default:
        // alt / title
        out.push(`${name}="${escapeAttr(value)}"`)
    }
    seen.add(name)
  }

  if (tag === 'a') {
    out.push(hasTargetBlank ? 'rel="noopener noreferrer nofollow"' : 'rel="nofollow"')
  }
  return out.length ? ' ' + out.join(' ') : ''
}

/** Escapes a "<" that could be read as the start of a tag by a browser. */
function escapeStrayLt(text: string): string {
  return text.replace(/<(?=[a-zA-Z/!?])/g, '&lt;')
}

export function sanitizeHtml(input: unknown): string {
  if (typeof input !== 'string' || !input) return ''

  let result = ''
  let lastIndex = 0
  let dropUntil: string | null = null // tag name whose content is being dropped
  let dropDepth = 0

  TAG_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TAG_RE.exec(input))) {
    const [full, closing, rawName, rawAttrs] = m
    const text = input.slice(lastIndex, m.index)
    lastIndex = m.index + full.length

    if (dropUntil) {
      // Inside a dropped element: only track nesting of the same tag name
      const name = rawName?.toLowerCase()
      if (name === dropUntil) {
        if (closing) {
          dropDepth -= 1
          if (dropDepth <= 0) dropUntil = null
        } else if (!full.endsWith('/>')) {
          dropDepth += 1
        }
      }
      continue
    }

    result += escapeStrayLt(text)

    if (full.startsWith('<!--')) continue // comment

    const name = rawName.toLowerCase()
    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && !full.endsWith('/>')) {
        dropUntil = name
        dropDepth = 1
      }
      continue
    }
    if (!(name in ALLOWED_TAGS)) continue // unknown tag: drop the tag, keep the text

    if (closing) {
      if (!VOID_TAGS.has(name)) result += `</${name}>`
      continue
    }

    const attrs = sanitizeAttributes(name, rawAttrs || '')
    if (name === 'input' && !attrs.includes('type="checkbox"')) continue
    result += `<${name}${attrs}>`
  }

  if (!dropUntil) result += escapeStrayLt(input.slice(lastIndex))
  return result
}
