'use client'

import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import NotesList from '@/components/notes/NotesList'
import { Search, Filter } from 'lucide-react'

interface Note {
  id: string
  title: string
  content: string
  created_at: string
  project_id: string
}

interface Project {
  id: string
  name: string
}

export default function NotesPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const [notes, setNotes] = useState<Note[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentWorkspace) {
      loadProjects()
      loadNotes()
    }
  }, [currentWorkspace])

  useEffect(() => {
    if (selectedProjectId) {
      loadNotes()
    }
  }, [selectedProjectId])

  const loadProjects = async () => {
    if (!currentWorkspace) return

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('workspace_id', currentWorkspace.id)
        .order('name')

      if (!error && data) {
        setProjects(data)
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const loadNotes = async () => {
    if (!currentWorkspace || !selectedProjectId) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setNotes(data as any)
      } else if (error) {
        console.error('Error loading notes:', error)
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">
          📝 Notes
        </h1>
        <p className="text-gray-400 text-base md:text-lg">
          Capture ideas, documentation, and important information
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="input-field w-full pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="input-field min-w-[200px]"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-pulse-slow text-gray-400">Loading notes...</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">No projects found</h3>
          <p className="text-gray-400">
            Create a project first to start adding notes
          </p>
        </div>
      ) : (
        <NotesList
          notes={filteredNotes}
          projectId={selectedProjectId}
          onRefresh={loadNotes}
        />
      )}
    </div>
  )
}
