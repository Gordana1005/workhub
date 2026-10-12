import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportNotes, exportTasks, exportTimeEntries } from './export'

/** Captures what export*() would have downloaded (no DOM in the node environment). */
let downloads: Array<{ filename: string; blob: Blob }> = []
let lastBlob: Blob

beforeEach(() => {
  downloads = []
  vi.stubGlobal('document', {
    body: { appendChild: () => {}, removeChild: () => {} },
    createElement: () => {
      const link: any = { click: () => downloads.push({ filename: link.download, blob: lastBlob }) }
      return link
    },
  })
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: any) => {
    lastBlob = blob
    return 'blob:fake'
  })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function exported(): Promise<{ filename: string; text: string }> {
  expect(downloads).toHaveLength(1)
  return { filename: downloads[0].filename, text: await downloads[0].blob.text() }
}

const task = (over: Record<string, any> = {}) => ({
  title: 'T',
  description: '',
  status: 'To Do',
  priority: 'medium',
  created_at: '2026-01-02T03:04:05Z',
  ...over,
})

describe('CSV export', () => {
  it('neutralises formula injection in every cell', async () => {
    exportTasks([task({ title: '=HYPERLINK("http://evil","x")', description: '+1+1', category: '@SUM(A1)' })], {
      format: 'csv',
      filename: 'tasks',
    })
    const { text } = await exported()
    // Papa prefixes dangerous leading characters with a single quote
    expect(text).toContain("'=HYPERLINK")
    expect(text).toContain("'+1+1")
    expect(text).toContain("'@SUM(A1)")
    expect(text).not.toMatch(/(^|,)"?=HYPERLINK/m)
  })

  it('quotes commas, quotes and newlines', async () => {
    exportTasks([task({ title: 'a, "b"', description: 'line1\nline2' })], { format: 'csv', filename: 'tasks' })
    const { text } = await exported()
    expect(text).toContain('"a, ""b"""')
    expect(text).toContain('"line1\nline2"')
  })

  it('uses the given filename with a .csv extension', async () => {
    exportTasks([task()], { format: 'csv', filename: 'my-tasks' })
    expect((await exported()).filename).toBe('my-tasks.csv')
  })

  it('survives missing / invalid dates', async () => {
    expect(() =>
      exportTasks([task({ created_at: undefined, due_date: 'not-a-date' })], { format: 'csv', filename: 'x' })
    ).not.toThrow()
    const { text } = await exported()
    expect(text.split('\n')[0]).toContain('Title')
  })
})

describe('Markdown export', () => {
  it('escapes pipes and flattens newlines inside cells', async () => {
    exportNotes([{ title: 'a|b', content: 'x\r\ny', created_at: '2026-01-01', updated_at: '2026-01-01' }], {
      format: 'markdown',
      filename: 'notes',
    })
    const { text, filename } = await exported()
    expect(filename).toBe('notes.md')
    expect(text).toContain('a\\|b')
    expect(text).toContain('x y')
    expect(text.startsWith('# notes')).toBe(true)
  })

  it('writes a placeholder for empty data', async () => {
    exportTasks([], { format: 'markdown', filename: 'empty' })
    expect((await exported()).text).toBe('No data to export')
  })
})

describe('JSON and time-entry export', () => {
  it('exports raw rows as JSON', async () => {
    exportTasks([task({ title: 'J' })], { format: 'json', filename: 'tasks' })
    const { text, filename } = await exported()
    expect(filename).toBe('tasks.json')
    expect(JSON.parse(text)[0].title).toBe('J')
  })

  it('formats durations in time-entry CSV', async () => {
    exportTimeEntries([{ duration: 3 * 3600 + 25 * 60, date: '2026-02-03', description: 'work' }], {
      format: 'csv',
      filename: 'time',
    })
    const { text } = await exported()
    expect(text).toContain('3h 25m')
    expect(text).toContain('3.42')
  })
})
