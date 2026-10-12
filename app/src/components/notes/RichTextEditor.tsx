'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useEditor, useEditorState, EditorContent, type Editor } from '@tiptap/react';
import {
  Bold, Italic, Code, List, ListOrdered, ListChecks,
  Heading1, Heading2, Heading3, Quote, CodeSquare,
  Undo, Redo, Link as LinkIcon, Image as ImageIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { createNoteExtensions, noteEditingClass, noteProseClass } from './noteDoc';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  /**
   * 'box' (default): self-contained bordered editor that grows with its content.
   * 'fill': fills its parent; the toolbar stays pinned and the document scrolls.
   */
  layout?: 'box' | 'fill';
  /** Rendered above the document (inside the scrolling area in 'fill' layout). */
  header?: ReactNode;
}

type EditorPrompt = {
  kind: 'link' | 'image';
  value: string;
  hadLink: boolean;
  from: number;
  to: number;
};

const fieldClass =
  'mt-1.5 w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2.5 text-base text-text-primary sm:text-sm placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

export default function RichTextEditor({
  content,
  onChange,
  placeholder,
  editable = true,
  layout = 'box',
  header,
}: RichTextEditorProps) {
  const t = useTranslations('pages.notes');
  const resolvedPlaceholder = placeholder ?? t('startWriting');
  const extensions = useMemo(() => createNoteExtensions({ placeholder: resolvedPlaceholder }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [prompt, setPrompt] = useState<EditorPrompt | null>(null);
  const fill = layout === 'fill';

  const editor = useEditor({
    extensions,
    content,
    editable,
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
    editorProps: {
      attributes: {
        class: `${noteProseClass} ${noteEditingClass} ${fill ? '' : 'px-3 py-3 sm:px-4'}`,
      },
    },
    immediatelyRender: false,
  }, [editable, extensions]);

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

  const openPrompt = (kind: EditorPrompt['kind']) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const href = kind === 'link' ? editor.getAttributes('link').href || '' : '';
    setPrompt({ kind, value: href, hadLink: Boolean(href), from, to });
  };

  const applyPrompt = (remove = false) => {
    if (!editor || !prompt) return;
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

  const dialog = (
    <Dialog
      open={prompt !== null}
      title={prompt?.kind === 'image' ? t('imageUrl') : t('toolbar.addLink')}
      onClose={() => setPrompt(null)}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {prompt?.kind === 'link' && prompt.hadLink ? (
            <Button type="button" variant="ghost" className="h-11 sm:h-10" onClick={() => applyPrompt(true)}>
              {t('removeLink')}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" className="h-11 sm:h-10" onClick={() => setPrompt(null)}>
            {t('cancel')}
          </Button>
          <Button type="submit" form="notes-url-form" className="h-11 sm:h-10">
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
            placeholder="https://"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            autoFocus
          />
        </label>
      </form>
    </Dialog>
  );

  if (fill) {
    // Same element structure before and after the editor instance exists, so the
    // header (title input etc.) is never remounted.
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface text-text-primary">
        {editable ? (
          editor ? (
            <Toolbar editor={editor} onPrompt={openPrompt} className="shrink-0 border-b border-border" />
          ) : (
            <div className="h-[3.25rem] shrink-0 border-b border-border sm:h-[2.9rem]" aria-hidden="true" />
          )
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-note-scroll>
          <div
            className="mx-auto min-h-full w-full max-w-[44rem] px-4 pb-[calc(10rem+env(safe-area-inset-bottom))] pt-4 sm:px-8 md:pt-8"
            onMouseDown={(event) => {
              // Clicking the empty area around the document puts the caret at the end.
              if (event.target === event.currentTarget && editable && editor) {
                event.preventDefault();
                editor.chain().focus('end').run();
              }
            }}
          >
            {header}
            {editor ? <EditorContent editor={editor} /> : null}
          </div>
        </div>

        {dialog}
      </div>
    );
  }

  if (!editor) return null;

  return (
    <div className="max-w-full overflow-hidden rounded-2xl border border-border bg-surface text-text-primary">
      {editable ? <Toolbar editor={editor} onPrompt={openPrompt} className="sticky top-0 z-10 border-b border-border" /> : null}
      {header}
      <EditorContent editor={editor} className="max-w-full bg-surface text-text-primary" />
      {dialog}
    </div>
  );
}

function Toolbar({
  editor,
  onPrompt,
  className = '',
}: {
  editor: Editor;
  onPrompt: (kind: EditorPrompt['kind']) => void;
  className?: string;
}) {
  const t = useTranslations('pages.notes');

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      code: current.isActive('code'),
      h1: current.isActive('heading', { level: 1 }),
      h2: current.isActive('heading', { level: 2 }),
      h3: current.isActive('heading', { level: 3 }),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      taskList: current.isActive('taskList'),
      blockquote: current.isActive('blockquote'),
      codeBlock: current.isActive('codeBlock'),
      link: current.isActive('link'),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });

  const run = (fn: () => void) => () => fn();
  const icon = 'h-4 w-4';

  return (
    <div
      role="toolbar"
      aria-label={t('content')}
      className={`flex max-w-full items-center gap-0.5 overflow-x-auto overscroll-x-contain bg-surface px-2 py-1 [-webkit-mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)] [mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)] [scrollbar-width:none] sm:px-3 sm:py-1.5 sm:[-webkit-mask-image:none] sm:[mask-image:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      <ToolbarButton
        onClick={run(() => editor.chain().focus().toggleBold().run())}
        active={state.bold}
        icon={<Bold className={icon} />}
        tooltip={t('toolbar.bold')}
      />
      <ToolbarButton
        onClick={run(() => editor.chain().focus().toggleItalic().run())}
        active={state.italic}
        icon={<Italic className={icon} />}
        tooltip={t('toolbar.italic')}
      />
      <ToolbarButton
        onClick={run(() => editor.chain().focus().toggleCode().run())}
        active={state.code}
        icon={<Code className={icon} />}
        tooltip={t('toolbar.inlineCode')}
      />

      <Divider />

      <ToolbarButton
        onClick={run(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        active={state.h1}
        icon={<Heading1 className={icon} />}
        tooltip={t('toolbar.heading1')}
      />
      <ToolbarButton
        onClick={run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        active={state.h2}
        icon={<Heading2 className={icon} />}
        tooltip={t('toolbar.heading2')}
      />
      <ToolbarButton
        onClick={run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        active={state.h3}
        icon={<Heading3 className={icon} />}
        tooltip={t('toolbar.heading3')}
      />

      <Divider />

      <ToolbarButton
        onClick={run(() => editor.chain().focus().toggleBulletList().run())}
        active={state.bulletList}
        icon={<List className={icon} />}
        tooltip={t('toolbar.bulletList')}
      />
      <ToolbarButton
        onClick={run(() => editor.chain().focus().toggleOrderedList().run())}
        active={state.orderedList}
        icon={<ListOrdered className={icon} />}
        tooltip={t('toolbar.numberedList')}
      />
      <ToolbarButton
        onClick={run(() => editor.chain().focus().toggleTaskList().run())}
        active={state.taskList}
        icon={<ListChecks className={icon} />}
        tooltip={t('toolbar.taskList')}
      />

      <Divider />

      <ToolbarButton
        onClick={run(() => editor.chain().focus().toggleBlockquote().run())}
        active={state.blockquote}
        icon={<Quote className={icon} />}
        tooltip={t('toolbar.quote')}
      />
      <ToolbarButton
        onClick={run(() => editor.chain().focus().toggleCodeBlock().run())}
        active={state.codeBlock}
        icon={<CodeSquare className={icon} />}
        tooltip={t('toolbar.codeBlock')}
      />

      <Divider />

      <ToolbarButton
        onClick={() => onPrompt('link')}
        active={state.link}
        icon={<LinkIcon className={icon} />}
        tooltip={t('toolbar.addLink')}
      />
      <ToolbarButton
        onClick={() => onPrompt('image')}
        icon={<ImageIcon className={icon} />}
        tooltip={t('toolbar.addImage')}
      />

      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-2 pr-3">
        <ToolbarButton
          onClick={run(() => editor.chain().focus().undo().run())}
          disabled={!state.canUndo}
          icon={<Undo className={icon} />}
          tooltip={t('toolbar.undo')}
        />
        <ToolbarButton
          onClick={run(() => editor.chain().focus().redo().run())}
          disabled={!state.canRedo}
          icon={<Redo className={icon} />}
          tooltip={t('toolbar.redo')}
        />
      </div>
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />;
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
      aria-pressed={active}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors active:bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-9 sm:w-9 ${
        active
          ? 'bg-primary/15 text-primary'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
      } disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent`}
    >
      {icon}
    </button>
  );
}
