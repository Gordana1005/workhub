'use client'

import { useEffect, useState, useCallback } from 'react'
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
  const { currentWorkspace, workspaces } = useWorkspaceStore()
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('')
  const [notes, setNotes] = useState<Note[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentWorkspace && !activeWorkspaceId) {
      setActiveWorkspaceId(currentWorkspace.id)
    }
  }, [currentWorkspace])

  useEffect(() => {
    if (activeWorkspaceId) {
      loadProjects()
      loadNotes()
    }
  }, [activeWorkspaceId])

  useEffect(() => {
    if (selectedProjectId) {
      loadNotes()
    }
  }, [selectedProjectId])

  const loadProjects = async () => {
    const wsId = activeWorkspaceId || currentWorkspace?.id
    if (!wsId) return

    try {
      const response = await fetch(`/api/projects?workspace_id=${wsId}`)
      const data = await response.json()

      if (response.ok && data.projects) {
        setProjects(data.projects)
        // Auto-selection of first project removed to allow "All Projects" by default
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const loadNotes = async () => {
    const wsId = activeWorkspaceId || currentWorkspace?.id
    if (!wsId) return

    try {
      setLoading(true)
      
      const url = selectedProjectId 
        ? `/api/notes?projectId=${selectedProjectId}` 
        : `/api/notes?workspaceId=${wsId}`

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setNotes(data || [])
      } else {
        console.error('Error loading notes:', data.error)
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">
            📝 Notes
          </h1>
          <p className="text-gray-400 text-base md:text-lg">
            Capture ideas, documentation, and important information
          </p>
        </div>

        <div className="w-full md:w-64">
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Workspace Context
          </label>
          <select
            value={activeWorkspaceId}
            onChange={(e) => {
              setActiveWorkspaceId(e.target.value)
              setSelectedProjectId('') 
            }}
            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        </div>
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
          workspaceId={activeWorkspaceId || currentWorkspace?.id || ''}
          projects={projects}
          onRefresh={loadNotes}
        />
      )}
    </div>
  )
}
