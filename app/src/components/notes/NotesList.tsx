'use client'

import NoteCard from './NoteCard'

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

interface NotesListProps {
  notes: Note[]
  selectedId?: string
  onOpen: (note: Note) => void
  onDelete: (id: string) => void
}

export default function NotesList({ notes, selectedId, onOpen, onDelete }: NotesListProps) {
  return (
    <div className="min-w-0">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          active={note.id === selectedId}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
