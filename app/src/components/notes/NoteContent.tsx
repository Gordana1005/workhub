'use client'

import { useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { createNoteExtensions, noteProseClass } from './noteDoc'

interface NoteContentProps {
  html: string
  /** Fired after the document has been (re)rendered, e.g. to scan headings. */
  onRendered?: () => void
}

/**
 * Read-only, syntax-highlighted rendering of a note's stored HTML. The editor
 * schema parses the HTML, so unknown tags and attributes (scripts, handlers)
 * are dropped instead of being injected into the page.
 */
export default function NoteContent({ html, onRendered }: NoteContentProps) {
  const extensions = useMemo(() => createNoteExtensions(), [])
  const editor = useEditor(
    {
      extensions,
      content: html,
      editable: false,
      immediatelyRender: false,
      editorProps: { attributes: { class: noteProseClass } },
    },
    [extensions]
  )

  useEffect(() => {
    if (editor && html !== editor.getHTML()) {
      editor.commands.setContent(html || '', { emitUpdate: false })
    }
  }, [html, editor])

  useEffect(() => {
    if (!editor || !onRendered) return
    const frame = requestAnimationFrame(onRendered)
    return () => cancelAnimationFrame(frame)
  }, [editor, html, onRendered])

  return <EditorContent editor={editor} />
}
