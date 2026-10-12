import { describe, expect, it } from 'vitest'
import { isSafeUrl, sanitizeHtml } from './sanitize-html'

describe('sanitizeHtml: dangerous content', () => {
  it('removes script elements together with their content', () => {
    expect(sanitizeHtml('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>')
    expect(sanitizeHtml('<SCRIPT src="x.js"></SCRIPT>ok')).toBe('ok')
  })

  it('drops an unterminated script block entirely', () => {
    expect(sanitizeHtml('<p>a</p><script>alert(1)')).toBe('<p>a</p>')
  })

  it('removes iframes, objects, svg, style and form elements', () => {
    expect(sanitizeHtml('<iframe src="https://evil"></iframe>x')).toBe('x')
    expect(sanitizeHtml('<object data="x"></object>x')).toBe('x')
    expect(sanitizeHtml('<svg onload="a()"><circle/></svg>x')).toBe('x')
    expect(sanitizeHtml('<style>body{display:none}</style>x')).toBe('x')
    expect(sanitizeHtml('<form action="/x"><button>go</button></form>x')).toBe('x')
  })

  it('strips on* event handlers', () => {
    const out = sanitizeHtml('<img src="https://a/b.png" onerror="alert(1)">')
    expect(out).toBe('<img src="https://a/b.png">')
    expect(sanitizeHtml('<p onclick="x()" class="a">t</p>')).toBe('<p class="a">t</p>')
  })

  it('strips javascript: URLs, including obfuscated ones', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript')
    expect(sanitizeHtml('<a href="JaVaScRiPt:alert(1)">x</a>')).not.toContain('href')
    expect(sanitizeHtml('<a href="java&#x73;cript:alert(1)">x</a>')).not.toContain('href')
    expect(sanitizeHtml('<a href="&#106;avascript:alert(1)">x</a>')).not.toContain('href')
    expect(sanitizeHtml('<a href="java\tscript:alert(1)">x</a>')).not.toContain('href')
    expect(sanitizeHtml('<a href=" javascript:alert(1)">x</a>')).not.toContain('href')
  })

  it('blocks data: and vbscript: links, and non-image data on img', () => {
    expect(sanitizeHtml('<a href="data:text/html;base64,AAAA">x</a>')).not.toContain('href')
    expect(sanitizeHtml('<a href="vbscript:x">x</a>')).not.toContain('href')
    expect(sanitizeHtml('<img src="data:image/svg+xml;base64,AAAA">')).not.toContain('src')
    expect(sanitizeHtml('<img src="data:text/html;base64,AAAA">')).not.toContain('src')
  })

  it('drops style attributes and unknown attributes', () => {
    expect(sanitizeHtml('<p style="position:fixed" id="x" data-x="1">t</p>')).toBe('<p>t</p>')
  })

  it('removes comments and conditional comments', () => {
    expect(sanitizeHtml('a<!-- <script>x</script> -->b')).toBe('ab')
  })

  it('escapes a stray "<" that could open a tag', () => {
    expect(sanitizeHtml('<img src=x onerror=alert(1)//')).toBe('&lt;img src=x onerror=alert(1)//')
    expect(sanitizeHtml('<scr<script>ipt>alert(1)')).not.toMatch(/<script/i)
  })

  it('never lets a quoted ">" smuggle an attribute through', () => {
    const out = sanitizeHtml('<a href="https://ok.com" title="a>b" onmouseover="x()">t</a>')
    expect(out).not.toContain('onmouseover')
    expect(out).toContain('href="https://ok.com"')
  })

  it('only allows checkbox inputs', () => {
    expect(sanitizeHtml('<input type="text" value="x">')).toBe('')
    expect(sanitizeHtml('<input type="checkbox" checked disabled onclick="x()">')).toBe(
      '<input type="checkbox" checked disabled>'
    )
  })
})

describe('sanitizeHtml: keeps TipTap content', () => {
  it('keeps basic formatting', () => {
    const html = '<h1>T</h1><p>a <strong>b</strong> <em>c</em> <code>d</code></p><blockquote><p>q</p></blockquote><hr><pre><code class="language-ts">x</code></pre>'
    expect(sanitizeHtml(html)).toBe(html)
  })

  it('keeps lists and ordered list start', () => {
    expect(sanitizeHtml('<ul><li><p>a</p></li></ul><ol start="3"><li>b</li></ol>')).toBe(
      '<ul><li><p>a</p></li></ul><ol start="3"><li>b</li></ol>'
    )
  })

  it('keeps task-list attributes', () => {
    const html =
      '<ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>x</p></div></li></ul>'
    const out = sanitizeHtml(html)
    expect(out).toContain('data-type="taskList"')
    expect(out).toContain('data-type="taskItem"')
    expect(out).toContain('data-checked="true"')
    expect(out).toContain('<input type="checkbox" checked>')
  })

  it('rejects unexpected data-type / data-checked values', () => {
    expect(sanitizeHtml('<li data-type="evil" data-checked="maybe">x</li>')).toBe('<li>x</li>')
  })

  it('keeps links with safe schemes and adds rel', () => {
    expect(sanitizeHtml('<a href="https://example.com/a?b=1&amp;c=2">x</a>')).toBe(
      '<a href="https://example.com/a?b=1&amp;c=2" rel="nofollow">x</a>'
    )
    expect(sanitizeHtml('<a href="mailto:a@b.com">m</a>')).toContain('href="mailto:a@b.com"')
    expect(sanitizeHtml('<a href="/dashboard">r</a>')).toContain('href="/dashboard"')
    expect(sanitizeHtml('<a href="#top">r</a>')).toContain('href="#top"')
  })

  it('hardens target=_blank links', () => {
    const out = sanitizeHtml('<a href="https://e.com" target="_blank">x</a>')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener noreferrer nofollow"')
    expect(sanitizeHtml('<a href="https://e.com" target="_top">x</a>')).not.toContain('target')
  })

  it('keeps images with safe sources', () => {
    expect(sanitizeHtml('<img src="https://e.com/a.png" alt="A" width="10" height="20">')).toBe(
      '<img src="https://e.com/a.png" alt="A" width="10" height="20">'
    )
    expect(sanitizeHtml('<img src="data:image/png;base64,iVBORw0KGgo=">')).toContain('src="data:image/png;base64,iVBORw0KGgo="')
  })

  it('keeps span/div classes but strips odd characters', () => {
    expect(sanitizeHtml('<span class="hljs-keyword">x</span>')).toBe('<span class="hljs-keyword">x</span>')
    expect(sanitizeHtml('<div class="a&quot; onload=&quot;x">y</div>')).toBe('<div class="a onloadx">y</div>')
  })

  it('keeps text of unknown tags and leaves plain text alone', () => {
    expect(sanitizeHtml('<custom>hello</custom>')).toBe('hello')
    expect(sanitizeHtml('plain text')).toBe('plain text')
    expect(sanitizeHtml('1 < 2 and 3 > 2')).toBe('1 < 2 and 3 > 2')
    expect(sanitizeHtml('a &amp; b &lt;c&gt;')).toBe('a &amp; b &lt;c&gt;')
  })

  it('is idempotent', () => {
    const html = '<p>a</p><a href="https://e.com" target="_blank">x</a><ul data-type="taskList"><li data-type="taskItem" data-checked="false">t</li></ul>'
    const once = sanitizeHtml(html)
    expect(sanitizeHtml(once)).toBe(once)
  })

  it('returns an empty string for non-strings', () => {
    expect(sanitizeHtml(undefined)).toBe('')
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(42)).toBe('')
    expect(sanitizeHtml('')).toBe('')
  })
})

describe('isSafeUrl', () => {
  it('allows web, mail, tel and relative URLs', () => {
    for (const ok of ['https://a.com', 'http://a.com', 'mailto:a@b.c', 'tel:+123', '/a/b', '#x', 'a/b', '?q=1']) {
      expect(isSafeUrl(ok)).toBe(true)
    }
  })

  it('rejects script-capable and empty URLs', () => {
    for (const bad of ['javascript:1', 'data:text/html,x', 'vbscript:1', 'file:///etc/passwd', '', '   ']) {
      expect(isSafeUrl(bad)).toBe(false)
    }
  })

  it('allows inline raster images only when asked', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo='
    expect(isSafeUrl(png)).toBe(false)
    expect(isSafeUrl(png, true)).toBe(true)
    expect(isSafeUrl('data:image/svg+xml;base64,AAAA', true)).toBe(false)
  })
})
