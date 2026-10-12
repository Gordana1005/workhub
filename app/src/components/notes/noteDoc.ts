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

/**
 * Typography for note documents (reading and editing). Uses theme tokens only,
 * so it works in light and dark.
 */
export const noteProseClass = [
  'break-words text-base leading-[1.75] text-text-primary sm:text-[1.0625rem]',
  '[&>*:first-child]:mt-0',
  // headings
  '[&_h1]:mb-3 [&_h1]:mt-10 [&_h1]:scroll-mt-6 [&_h1]:text-[1.75rem] [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:tracking-tight [&_h1]:text-text-primary',
  '[&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:scroll-mt-6 [&_h2]:text-[1.4rem] [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:tracking-tight [&_h2]:text-text-primary',
  '[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:scroll-mt-6 [&_h3]:text-[1.15rem] [&_h3]:font-semibold [&_h3]:leading-snug [&_h3]:text-text-primary',
  // text
  '[&_p]:my-4 [&_p]:break-words',
  '[&_strong]:font-semibold',
  '[&_a]:cursor-pointer [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-2 [&_a]:transition-colors [&_a:hover]:decoration-primary',
  '[&_hr]:my-8 [&_hr]:border-border',
  // lists
  '[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6',
  '[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_li]:my-1.5 [&_li::marker]:text-text-muted',
  '[&_li_p]:my-1 [&_li_ul]:my-1 [&_li_ol]:my-1',
  // task lists
  '[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0',
  '[&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]]:gap-3',
  '[&_li[data-type=taskItem]>label]:mt-[0.42rem] [&_li[data-type=taskItem]>label]:shrink-0',
  '[&_li[data-type=taskItem]>div]:min-w-0 [&_li[data-type=taskItem]>div]:flex-1',
  '[&_input[type=checkbox]]:h-4 [&_input[type=checkbox]]:w-4 [&_input[type=checkbox]]:cursor-pointer [&_input[type=checkbox]]:accent-primary',
  '[&_li[data-checked=true]>div]:text-text-muted [&_li[data-checked=true]>div]:line-through',
  // quote
  '[&_blockquote]:my-5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-text-secondary',
  '[&_blockquote_p]:my-2',
  // code
  '[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:border [&_:not(pre)>code]:border-border [&_:not(pre)>code]:bg-surface-hover [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.875em] [&_:not(pre)>code]:text-text-primary',
  '[&_pre]:my-5 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border [&_pre]:bg-surface-hover [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[0.875rem] [&_pre]:leading-relaxed [&_pre]:text-text-primary',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
  '[&_.hljs-comment]:italic [&_.hljs-comment]:text-text-muted [&_.hljs-quote]:text-text-muted',
  '[&_.hljs-keyword]:text-primary [&_.hljs-selector-tag]:text-primary [&_.hljs-literal]:text-warning',
  '[&_.hljs-string]:text-success [&_.hljs-number]:text-warning',
  '[&_.hljs-title]:text-danger [&_.hljs-attr]:text-primary [&_.hljs-variable]:text-text-primary',
  // images
  '[&_img]:my-5 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-border',
].join(' ')

/** Extra classes only applied while editing. */
export const noteEditingClass = [
  'min-h-[50vh] outline-none focus:outline-none',
  '[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-text-muted [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
  '[&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-primary',
].join(' ')
