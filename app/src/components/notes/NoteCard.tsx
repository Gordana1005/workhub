'use client'

import { FileText, Trash2, Edit, Calendar, User } from 'lucide-react'

interface Note {
  id: string
  title: string
  content: string
  created_at: string
}

interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
}

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getPreview = (content: string) => {
    if (!content) return 'No content'
    return content.slice(0, 150) + (content.length > 150 ? '...' : '')
  }

  return (
    <div className="card p-6 card-hover group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-blue-purple flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1 truncate">{note.title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(note)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"
            title="Edit note"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-4 line-clamp-3">
        {getPreview(note.content)}
      </p>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(note.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
