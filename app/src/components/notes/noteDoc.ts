import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import type { Extensions } from '@tiptap/react'
import { common, createLowlight } from 'lowlight'

export const noteLowlight = createLowlight(common)

/**
 * Single source of truth for the note schema, so the reader and the editor
 * parse and render exactly the same document.
 */
export function createNoteExtensions(options: { placeholder?: string } = {}): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
      codeBlock: false,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'cursor-pointer' },
    }),
    Image,
    CodeBlockLowlight.configure({ lowlight: noteLowlight }),
    TaskList,
    TaskItem.configure({ nested: true }),
  ]

  if (options.placeholder !== undefined) {
    extensions.push(Placeholder.configure({ placeholder: options.placeholder }))
  }

  return extensions
}

export { noteProseClass, noteEditingClass } from './noteStyles'
