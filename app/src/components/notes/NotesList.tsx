'use client'

import { useState } from 'react'
import NoteCard from './NoteCard'
import NoteEditor from './NoteEditor'
import TemplateSelector from './TemplateSelector'
import { Plus, FileText, Sparkles } from 'lucide-react'

interface Tag {
  id: string
  name: string
  color: string
}

interface Note {
  id: string
  title: string
  content: string
  created_at: string
  project_id?: string
  tags?: Tag[]
}

interface Project {
  id: string
  name: string
}

interface NotesListProps {
  notes: Note[]
  projectId?: string
  workspaceId: string
  projects?: Project[]
  onRefresh: () => void
}

export default function NotesList({ notes, projectId, workspaceId, projects = [], onRefresh }: NotesListProps) {
  const [showEditor, setShowEditor] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [templateContent, setTemplateContent] = useState<string>('')

  const handleCreate = async (title: string, content: string, tags: Tag[], targetProjectId: string) => {
    const finalProjectId = targetProjectId || projectId
    if (!finalProjectId) return

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: finalProjectId, title, content, tags }),
      })

      if (res.ok) {
        setShowEditor(false)
        setTemplateContent('')
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const handleUpdate = async (title: string, content: string, tags: Tag[]) => {
    if (!editingNote) return

    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingNote.id, title, content, tags }),
      })


      if (res.ok) {
        setEditingNote(null)
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to update note:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const res = await fetch(`/api/notes?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-purple-400" />
          Notes
        </h2>
        {projectId && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              From Template
            </button>
            <button
              onClick={() => setShowEditor(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-blue-purple flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No notes yet</h3>
          <p className="text-gray-400 mb-6">
            Create your first note to capture important information
          </p>
          {projectId && (
            <button
              onClick={() => setShowEditor(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Note
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onOpen={handleEdit}
            />
          ))}
        </div>
      )}

      {showEditor && (
        <NoteEditor
          workspaceId={workspaceId}
          initialContent={templateContent}
          projects={projects}
          initialProjectId={projectId}
          onSave={handleCreate}
          onCancel={() => {
            setShowEditor(false)
            setTemplateContent('')
          }}
        />
      )}

      {editingNote && (
        <NoteEditor
          workspaceId={workspaceId}
          noteId={editingNote.id}
          initialTitle={editingNote.title}
          initialContent={editingNote.content}
          initialTags={editingNote.tags || []}
          initialProjectId={editingNote.project_id}
          projects={projects}
          onSave={handleUpdate}
          onCancel={() => setEditingNote(null)}
          isEdit
        />
      )}

      {showTemplates && (
        <TemplateSelector
          workspaceId={workspaceId}
          onSelect={(template) => {
            setTemplateContent(template.content)
            setShowEditor(true)
            setShowTemplates(false)
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  )
}
