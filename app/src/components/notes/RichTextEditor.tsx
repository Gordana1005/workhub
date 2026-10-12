'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { common, createLowlight } from 'lowlight';
import {
  Bold, Italic, Code, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, CodeSquare,
  Undo, Redo, Link as LinkIcon, Image as ImageIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

type EditorPrompt = {
  kind: 'link' | 'image';
  value: string;
  hadLink: boolean;
  from: number;
  to: number;
};

const fieldClass =
  'mt-1.5 w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

const editorClass = [
  'max-w-none min-h-[12rem] bg-surface px-3 py-3 text-text-primary focus:outline-none sm:px-4',
  '[&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-text-primary',
  '[&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-text-primary',
  '[&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-text-primary',
  '[&_p]:my-2 [&_p]:break-words [&_p]:text-text-primary',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:my-0.5',
  '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-text-secondary',
  '[&_code]:rounded [&_code]:bg-surface-hover [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-text-primary',
  '[&_pre]:my-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface-hover [&_pre]:p-3 [&_pre]:text-text-primary',
  '[&_a]:text-primary [&_a]:underline',
  '[&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg',
  '[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0',
  '[&_input[type=checkbox]]:mt-1 [&_input[type=checkbox]]:accent-primary',
  '[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-text-muted [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
].join(' ');

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
  editable = true,
}: RichTextEditorProps) {
  const t = useTranslations('pages.notes');
  const resolvedPlaceholder = placeholder ?? t('startWriting');
  const lowlight = useMemo(() => createLowlight(common), []);
  const [prompt, setPrompt] = useState<EditorPrompt | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: resolvedPlaceholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-surface-hover text-text-primary rounded-lg p-4 my-4 overflow-x-auto max-w-full',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'list-none p-0',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2 my-1',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
    editorProps: {
      attributes: {
        class: editorClass,
      },
    },
    immediatelyRender: false,
  }, [editable, lowlight]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;
    const extension = editor.extensionManager.extensions.find((item) => item.name === 'placeholder');
    if (!extension || extension.options.placeholder === resolvedPlaceholder) return;
    extension.options.placeholder = resolvedPlaceholder;
    editor.view.dispatch(editor.state.tr);
  }, [editor, resolvedPlaceholder]);

  if (!editor) return null;

  const openPrompt = (kind: EditorPrompt['kind']) => {
    const { from, to } = editor.state.selection;
    const href = kind === 'link' ? editor.getAttributes('link').href || '' : '';
    setPrompt({ kind, value: href, hadLink: Boolean(href), from, to });
  };

  const applyPrompt = (remove = false) => {
    if (!prompt) return;
    const range = { from: prompt.from, to: prompt.to };
    const value = prompt.value.trim();

    if (prompt.kind === 'image') {
      if (value) {
        editor.chain().focus().setTextSelection(range).setImage({ src: value }).run();
      }
    } else if (remove || !value) {
      editor.chain().focus().setTextSelection(range).extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().setTextSelection(range).extendMarkRange('link').setLink({ href: value }).run();
    }

    setPrompt(null);
  };

  return (
    <div className="max-w-full overflow-hidden rounded-2xl border border-border bg-surface text-text-primary">
      {editable && (
        <div className="sticky top-0 z-10 flex max-w-full flex-wrap items-center gap-1 border-b border-border bg-surface px-2 py-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            icon={<Bold className="h-4 w-4" />}
            tooltip={t('toolbar.bold')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            icon={<Italic className="h-4 w-4" />}
            tooltip={t('toolbar.italic')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            icon={<Code className="h-4 w-4" />}
            tooltip={t('toolbar.inlineCode')}
          />

          <div className="mx-1 h-6 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            icon={<Heading1 className="h-4 w-4" />}
            tooltip={t('toolbar.heading1')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            icon={<Heading2 className="h-4 w-4" />}
            tooltip={t('toolbar.heading2')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            icon={<Heading3 className="h-4 w-4" />}
            tooltip={t('toolbar.heading3')}
          />

          <div className="mx-1 h-6 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            icon={<List className="h-4 w-4" />}
            tooltip={t('toolbar.bulletList')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            icon={<ListOrdered className="h-4 w-4" />}
            tooltip={t('toolbar.numberedList')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            icon={<span className="text-xs font-bold">☑</span>}
            tooltip={t('toolbar.taskList')}
          />

          <div className="mx-1 h-6 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            icon={<Quote className="h-4 w-4" />}
            tooltip={t('toolbar.quote')}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            icon={<CodeSquare className="h-4 w-4" />}
            tooltip={t('toolbar.codeBlock')}
          />

          <div className="mx-1 h-6 w-px bg-border" />

          <ToolbarButton
            onClick={() => openPrompt('link')}
            active={editor.isActive('link')}
            icon={<LinkIcon className="h-4 w-4" />}
            tooltip={t('toolbar.addLink')}
          />
          <ToolbarButton
            onClick={() => openPrompt('image')}
            icon={<ImageIcon className="h-4 w-4" />}
            tooltip={t('toolbar.addImage')}
          />

          <div className="ml-auto flex flex-wrap items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              icon={<Undo className="h-4 w-4" />}
              tooltip={t('toolbar.undo')}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              icon={<Redo className="h-4 w-4" />}
              tooltip={t('toolbar.redo')}
            />
          </div>
        </div>
      )}

      <EditorContent editor={editor} className="max-w-full bg-surface text-text-primary" />

      <Dialog
        open={prompt !== null}
        title={prompt?.kind === 'image' ? t('imageUrl') : t('toolbar.addLink')}
        onClose={() => setPrompt(null)}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {prompt?.kind === 'link' && prompt.hadLink ? (
              <Button type="button" variant="ghost" onClick={() => applyPrompt(true)}>
                {t('removeLink')}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => setPrompt(null)}>
              {t('cancel')}
            </Button>
            <Button type="submit" form="notes-url-form">
              {prompt?.kind === 'image' ? t('toolbar.addImage') : t('toolbar.addLink')}
            </Button>
          </div>
        }
      >
        <form
          id="notes-url-form"
          onSubmit={(event) => {
            event.preventDefault();
            applyPrompt(false);
          }}
        >
          <label className="block text-sm text-text-secondary">
            {prompt?.kind === 'image' ? t('imageUrl') : t('url')}
            <input
              value={prompt?.value ?? ''}
              onChange={(event) => setPrompt((current) => current ? { ...current, value: event.target.value } : current)}
              className={fieldClass}
              autoFocus
            />
          </label>
        </form>
      </Dialog>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  icon,
  tooltip,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  tooltip: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      aria-label={tooltip}
      className={`rounded-lg p-2 transition-colors ${
        active
          ? 'bg-primary text-white'
          : 'text-text-primary hover:bg-surface-hover'
      } disabled:cursor-not-allowed disabled:opacity-30`}
    >
      {icon}
    </button>
  );
}
