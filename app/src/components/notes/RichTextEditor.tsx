'use client';

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
  Undo, Redo, Link as LinkIcon, Image as ImageIcon
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = 'Start writing...',
  editable = true 
}: RichTextEditorProps) {
  
  const lowlight = createLowlight(common);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 hover:underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-4',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-slate-800 rounded-lg p-4 my-4 overflow-x-auto',
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
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none px-8 py-4 min-h-[300px]',
      },
    },
  });

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    
    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800 flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            icon={<Bold className="w-4 h-4" />}
            tooltip="Bold (Ctrl+B)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            icon={<Italic className="w-4 h-4" />}
            tooltip="Italic (Ctrl+I)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            icon={<Code className="w-4 h-4" />}
            tooltip="Inline code"
          />

          <div className="w-px h-6 bg-slate-700 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            icon={<Heading1 className="w-4 h-4" />}
            tooltip="Heading 1"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            icon={<Heading2 className="w-4 h-4" />}
            tooltip="Heading 2"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            icon={<Heading3 className="w-4 h-4" />}
            tooltip="Heading 3"
          />

          <div className="w-px h-6 bg-slate-700 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            icon={<List className="w-4 h-4" />}
            tooltip="Bullet list"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            icon={<ListOrdered className="w-4 h-4" />}
            tooltip="Numbered list"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            icon={<span className="text-xs font-bold">☑</span>}
            tooltip="Task list"
          />

          <div className="w-px h-6 bg-slate-700 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            icon={<Quote className="w-4 h-4" />}
            tooltip="Quote"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            icon={<CodeSquare className="w-4 h-4" />}
            tooltip="Code block"
          />

          <div className="w-px h-6 bg-slate-700 mx-1" />

          <ToolbarButton
            onClick={setLink}
            active={editor.isActive('link')}
            icon={<LinkIcon className="w-4 h-4" />}
            tooltip="Add link"
          />
          <ToolbarButton
            onClick={addImage}
            icon={<ImageIcon className="w-4 h-4" />}
            tooltip="Add image"
          />

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            icon={<Undo className="w-4 h-4" />}
            tooltip="Undo (Ctrl+Z)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            icon={<Redo className="w-4 h-4" />}
            tooltip="Redo (Ctrl+Shift+Z)"
          />
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({ 
  onClick, 
  active, 
  disabled, 
  icon, 
  tooltip 
}: { 
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`p-2 rounded-lg transition-colors ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {icon}
    </button>
  );
}
