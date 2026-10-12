'use client'

import { useLayoutEffect, useRef } from 'react'
import { noteProseClass } from './noteStyles'

interface NoteContentProps {
  html: string
  /** Fired after the document has been (re)rendered, e.g. to scan headings. */
  onRendered?: () => void
}

// ---------------------------------------------------------------------------
// Light, dependency-free renderer for a note's stored HTML. It rebuilds the document
// through an allow-list (the same structure the editor schema produces), so scripts, event
// handlers, styles and unknown tags never reach the page, and no editor code is downloaded
// just to read a note. Syntax highlighting is loaded only when a note contains code blocks.
// ---------------------------------------------------------------------------

const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript', 'link', 'meta', 'head', 'form', 'textarea', 'select', 'button', 'audio', 'video'])
const RENAME: Record<string, string> = { b: 'strong', i: 'em', strike: 's', del: 's', h4: 'h3', h5: 'h3', h6: 'h3' }
const KEEP = new Set(['p', 'br', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'hr', 'a', 'img', 'label', 'input', 'div', 'span'])

function safeUrl(value: string | null, allowData = false): string | null {
  if (!value) return null
  const url = value.trim()
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url
  if (/^(\/|#|\.\/|\.\.\/)/.test(url)) return url
  if (allowData && /^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(url)) return url
  return null
}

function build(source: Node, target: Node, doc: Document) {
  source.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(child.textContent || ''))
      return
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return
    const element = child as Element
    const original = element.tagName.toLowerCase()
    if (DROP.has(original)) return
    const tag = RENAME[original] || original
    if (!KEEP.has(tag)) {
      build(element, target, doc) // unknown wrapper: keep its content only
      return
    }

    const out = doc.createElement(tag)
    switch (tag) {
      case 'a': {
        const href = safeUrl(element.getAttribute('href'))
        if (href) {
          out.setAttribute('href', href)
          out.setAttribute('target', '_blank')
          out.setAttribute('rel', 'noopener noreferrer nofollow')
        }
        break
      }
      case 'img': {
        const src = safeUrl(element.getAttribute('src'), true)
        if (!src) return
        out.setAttribute('src', src)
        out.setAttribute('alt', element.getAttribute('alt') || '')
        const title = element.getAttribute('title')
        if (title) out.setAttribute('title', title)
        out.setAttribute('loading', 'lazy')
        out.setAttribute('decoding', 'async')
        break
      }
      case 'ul':
        if (element.getAttribute('data-type') === 'taskList') out.setAttribute('data-type', 'taskList')
        break
      case 'ol': {
        const start = Number(element.getAttribute('start'))
        if (Number.isInteger(start) && start > 1 && start < 100000) out.setAttribute('start', String(start))
        break
      }
      case 'li':
        if (element.getAttribute('data-type') === 'taskItem') {
          out.setAttribute('data-type', 'taskItem')
          out.setAttribute('data-checked', element.getAttribute('data-checked') === 'true' ? 'true' : 'false')
        }
        break
      case 'input': {
        if ((element.getAttribute('type') || '').toLowerCase() !== 'checkbox') return
        const checked = element.hasAttribute('checked') || element.closest('li')?.getAttribute('data-checked') === 'true'
        out.setAttribute('type', 'checkbox')
        out.setAttribute('disabled', '')
        if (checked) out.setAttribute('checked', '')
        break
      }
      case 'code': {
        const match = /(?:^|\s)language-([\w+#-]{1,30})(?:\s|$)/.exec(element.getAttribute('class') || '')
        if (match) out.setAttribute('class', `language-${match[1]}`)
        break
      }
      default:
        break
    }
    if (tag !== 'br' && tag !== 'hr' && tag !== 'img' && tag !== 'input') build(element, out, doc)
    target.appendChild(out)
  })
}

interface HastNode {
  type: string
  value?: string
  tagName?: string
  properties?: { className?: string[] }
  children?: HastNode[]
}

function hastToDom(node: HastNode, doc: Document): Node {
  if (node.type === 'text') return doc.createTextNode(node.value || '')
  const el = doc.createElement(node.tagName || 'span')
  const classes = node.properties?.className
  if (classes?.length) el.className = classes.join(' ')
  node.children?.forEach((child) => el.appendChild(hastToDom(child, doc)))
  return el
}

type Lowlight = {
  registered: (name: string) => boolean
  highlight: (name: string, value: string) => { children: HastNode[] }
  highlightAuto: (value: string) => { children: HastNode[] }
}
let lowlightPromise: Promise<Lowlight> | null = null
function loadLowlight() {
  lowlightPromise ??= import('lowlight').then(({ common, createLowlight }) => createLowlight(common) as unknown as Lowlight)
  return lowlightPromise
}

export default function NoteContent({ html, onRendered }: NoteContentProps) {
  const ref = useRef<HTMLDivElement>(null)
  const onRenderedRef = useRef(onRendered)
  onRenderedRef.current = onRendered

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    let cancelled = false

    const parsed = new DOMParser().parseFromString(html || '', 'text/html')
    const fragment = document.createDocumentFragment()
    build(parsed.body, fragment, document)
    root.replaceChildren(fragment)
    onRenderedRef.current?.()

    const blocks = Array.from(root.querySelectorAll<HTMLElement>('pre > code'))
    if (blocks.length > 0) {
      loadLowlight()
        .then((lowlight) => {
          if (cancelled) return
          for (const block of blocks) {
            const code = block.textContent || ''
            const language = /language-([\w+#-]+)/.exec(block.className)?.[1]
            try {
              const tree = language && lowlight.registered(language) ? lowlight.highlight(language, code) : lowlight.highlightAuto(code)
              block.replaceChildren(...tree.children.map((child) => hastToDom(child, document)))
            } catch {
              // leave the code block un-highlighted
            }
          }
        })
        .catch(() => {})
    }

    return () => {
      cancelled = true
    }
  }, [html])

  return <div ref={ref} className={noteProseClass} />
}
