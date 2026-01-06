'use client'

import { useState } from 'react'
import { X, Save, History } from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import TagSelector from './TagSelector'
import VersionHistory from './VersionHistory'

interface Tag {
  id: string
  name: string
  color: string
}

interface NoteEditorProps {
  initialTitle?: string
  initialContent?: string
  initialTags?: Tag[]
  noteId?: string
  workspaceId: string
  onSave: (title: string, content: string, tags: Tag[]) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
}

export default function NoteEditor({
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  noteId,
  workspaceId,
  onSave,
  onCancel,
  isEdit = false
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [isSaving, setIsSaving] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return

    setIsSaving(true)
    try {
      await onSave(title, content, tags)
    } catch (error) {
      console.error('Failed to save note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestore = (restoredContent: string, restoredTitle: string) => {
    setContent(restoredContent)
    setTitle(restoredTitle)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="card w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold">
            {isEdit ? 'Edit Note' : 'New Note'}
          </h2>
          <div className="flex items-center gap-2">
            {isEdit && noteId && (
              <button
                onClick={() => setShowVersionHistory(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                title="Version History"
              >
                <History className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="input-field w-full text-lg"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Tags
            </label>
            <TagSelector
              workspaceId={workspaceId}
              selectedTags={tags}
              onChange={setTags}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Content
            </label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing your note... Use the toolbar or markdown shortcuts"
              editable={true}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onCancel}
            className="btn-secondary"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex items-center gap-2"
            disabled={!title.trim() || isSaving}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>

      {/* Version History Modal */}
      {showVersionHistory && noteId && (
        <VersionHistory
          noteId={noteId}
          currentContent={content}
          currentTitle={title}
          onRestore={handleRestore}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </div>
  )
}
