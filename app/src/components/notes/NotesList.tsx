'use client'

import NoteCard from './NoteCard'
import type { NoteRecord } from './noteUtils'

interface NotesListProps {
  notes: NoteRecord[]
  selectedId?: string
  showUpdated?: boolean
  showProject?: boolean
  showMenu?: boolean
  onOpen: (note: NoteRecord) => void
  onDelete: (id: string) => void
}

export default function NotesList({
  notes,
  selectedId,
  showUpdated,
  showProject,
  showMenu,
  onOpen,
  onDelete,
}: NotesListProps) {
  return (
    <div className="min-w-0">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          active={note.id === selectedId}
          showUpdated={showUpdated}
          showProject={showProject}
          showMenu={showMenu}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
