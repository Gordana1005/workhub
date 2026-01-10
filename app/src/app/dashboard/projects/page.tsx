'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Grid, List, Calendar, X, Edit2, Trash2, Upload, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Project {
  id: string
  name: string
  description: string | null
  color: string | null
  status: string
  start_date: string | null
  end_date: string | null
  created_at: string
  creator_id: string
  logo_url: string | null
}

export default function ProjectsPage() {
  const router = useRouter()
  const { currentWorkspace } = useWorkspaceStore()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#667eea',
    status: 'active',
    start_date: '',
    end_date: '',
    logo_file: null as File | null
  })

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
      setUserLoading(false)
    }
    getCurrentUser()
  }, [])

  const loadProjects = useCallback(async () => {
    if (!currentWorkspace) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/projects?workspace_id=${currentWorkspace.id}`)
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error)
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace])

  useEffect(() => {
    if (currentWorkspace) {
      loadProjects()
    }
  }, [currentWorkspace, loadProjects])

  // Also load data on mount in case currentWorkspace is already set
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentWorkspace) {
        loadProjects()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [currentWorkspace, loadProjects])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentWorkspace) {
      alert('Please select a workspace first')
      return
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to create projects')
        return
      }

      let logo_url = null

      // Upload logo if provided
      if (formData.logo_file) {
        setUploadingLogo(true)
        const fileExt = formData.logo_file.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `project-logos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('project-assets')
          .upload(filePath, formData.logo_file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('project-assets')
          .getPublicUrl(filePath)

        logo_url = urlData.publicUrl
        setUploadingLogo(false)
      }

      const projectData: any = {
        workspace_id: currentWorkspace.id,
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      }

      if (logo_url) {
        projectData.logo_url = logo_url
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      })
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      // Reset form and reload
      setFormData({
        name: '',
        description: '',
        color: '#667eea',
        status: 'active',
        start_date: '',
        end_date: '',
        logo_file: null
      })
      setShowCreateDialog(false)
      loadProjects()
    } catch (error) {
      console.error('Error creating project:', error)
      alert(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setUploadingLogo(false)
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingProject) return

    try {
      let logo_url = editingProject.logo_url

      // Upload new logo if provided
      if (formData.logo_file) {
        setUploadingLogo(true)
        const fileExt = formData.logo_file.name.split('.').pop()
        const fileName = `${editingProject.id}-${Date.now()}.${fileExt}`
        const filePath = `project-logos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('project-assets')
          .upload(filePath, formData.logo_file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('project-assets')
          .getPublicUrl(filePath)

        logo_url = urlData.publicUrl
        setUploadingLogo(false)
      }

      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProject.id,
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          logo_url: logo_url
        })
      })
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      // Reset form and reload
      setFormData({
        name: '',
        description: '',
        color: '#667eea',
        status: 'active',
        start_date: '',
        end_date: '',
        logo_file: null
      })
      setEditingProject(null)
      loadProjects()
    } catch (error) {
      console.error('Error updating project:', error)
      alert(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setUploadingLogo(false)
    }
  }

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color || '#667eea',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      logo_file: null
    })
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (3MB max)
      if (file.size > 3 * 1024 * 1024) {
        alert('File size must be less than 3MB')
        return
      }
      setFormData({ ...formData, logo_file: file })
    }
  }

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this project? This will also delete all associated tasks.')) {
      return
    }

    try {
      const response = await fetch(`/api/projects?id=${projectId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      loadProjects()
    } catch (error) {
      console.error('Error deleting project:', error)
      alert(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Projects</h1>
        <p className="text-gray-400">Manage and track all your projects</p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('grid')}
            className={`p-3 rounded-xl transition-all ${
              view === 'grid'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-gray-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-3 rounded-xl transition-all ${
              view === 'list'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-gray-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Project
          </Button>
        </div>
      </div>

      {/* Projects Grid/List */}
      {loading || userLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <div className="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No projects yet</h3>
          <p className="text-gray-400 mb-6">Create your first project to get started</p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-blue-500 transition-all cursor-pointer group relative"
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
            >
              {/* Action buttons - fixed z-index and positioning */}
              <div className="absolute top-4 right-4 flex items-center gap-2" style={{ zIndex: 20 }}>
                {/* Show edit/delete for all projects in user's workspace */}
                <button
                  onClick={(e) => handleEditProject(project, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-400 hover:text-blue-300"
                  title="Edit project"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDeleteProject(project.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {project.logo_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.logo_url}
                        alt={project.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </>
                  ) : (
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: project.color || '#667eea' }}
                    >
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  project.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  project.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  project.status === 'on-hold' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  project.status === 'completed' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                  'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {project.status.replace('-', ' ')}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
              {project.description && (
                <p className="text-gray-400 mb-4 line-clamp-2">{project.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-400">
                {project.start_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(project.start_date).toLocaleDateString()}
                  </div>
                )}
                {project.end_date && (
                  <div className="flex items-center gap-1">
                    → {new Date(project.end_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Project Dialog */}
      {(showCreateDialog || editingProject) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateDialog(false)
                  setEditingProject(null)
                  setFormData({
                    name: '',
                    description: '',
                    color: '#667eea',
                    status: 'active',
                    start_date: '',
                    end_date: '',
                    logo_file: null
                  })
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={editingProject ? handleUpdateProject : handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Logo (Max 3MB)
                </label>
                <div className="flex items-center gap-4">
                  {formData.logo_file && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(formData.logo_file)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {editingProject?.logo_url && !formData.logo_file && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editingProject.logo_url}
                        alt="Current logo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-gray-400 hover:text-white hover:border-blue-500 transition-all">
                      <Upload className="w-5 h-5" />
                      <span>{formData.logo_file ? formData.logo_file.name : 'Choose logo image...'}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: Square image, PNG or JPG, max 3MB
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#feca57', '#ff6b6b', '#4ecdc4'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg transition-all ${
                          formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="in-progress">In Progress</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setShowCreateDialog(false)
                    setEditingProject(null)
                    setFormData({
                      name: '',
                      description: '',
                      color: '#667eea',
                      status: 'active',
                      start_date: '',
                      end_date: '',
                      logo_file: null
                    })
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploadingLogo}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploadingLogo ? 'Uploading...' : editingProject ? 'Update Project' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
