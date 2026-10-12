'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconMenu } from '@/components/ui/IconMenu'
import { PageHeader } from '@/components/ui/PageHeader'
import CreateProjectDialog from '@/components/create/CreateProjectDialog'

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

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#feca57', '#ff6b6b', '#4ecdc4']

const fieldClass =
  'w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

const emptyForm = {
  name: '',
  description: '',
  color: '#667eea',
  status: 'active',
  start_date: '',
  end_date: '',
  logo_file: null as File | null,
}

export default function ProjectsPage() {
  const t = useTranslations('pages.projects')
  const locale = useLocale()
  const router = useRouter()
  const { currentWorkspace } = useWorkspaceStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: t('status.active'),
      completed: t('status.completed'),
      planning: t('status.planning'),
      archived: t('status.archived'),
      on_hold: t('status.onHold'),
      'on-hold': t('status.onHold'),
      in_progress: t('status.inProgress'),
      'in-progress': t('status.inProgress'),
    }
    return map[status] ?? status.replace(/[-_]/g, ' ')
  }

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
    if (currentWorkspace) loadProjects()
  }, [currentWorkspace, loadProjects])

  const closeEdit = () => {
    setEditingProject(null)
    setFormData(emptyForm)
  }

  const handleUpdateProject = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingProject) return

    try {
      let logoUrl = editingProject.logo_url
      if (formData.logo_file) {
        setUploadingLogo(true)
        const fileExt = formData.logo_file.name.split('.').pop()
        const filePath = `project-logos/${editingProject.id}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('project-assets').upload(filePath, formData.logo_file)
        if (uploadError) throw uploadError
        logoUrl = supabase.storage.from('project-assets').getPublicUrl(filePath).data.publicUrl
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
          logo_url: logoUrl,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      closeEdit()
      loadProjects()
    } catch (error) {
      console.error('Error updating project:', error)
      alert(t('updateFailed', { error: error instanceof Error ? error.message : t('unknownError') }))
      setUploadingLogo(false)
    }
  }

  const openEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color || '#667eea',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      logo_file: null,
    })
  }

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      alert(t('fileTooLarge'))
      return
    }
    setFormData({ ...formData, logo_file: file })
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm(t('deleteConfirm'))) return
    try {
      const response = await fetch(`/api/projects?id=${projectId}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      loadProjects()
    } catch (error) {
      console.error('Error deleting project:', error)
      alert(t('deleteFailed', { error: error instanceof Error ? error.message : t('unknownError') }))
    }
  }

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const dateLabel = (project: Project) => {
    const start = project.start_date ? new Date(project.start_date).toLocaleDateString(locale) : ''
    const end = project.end_date ? new Date(project.end_date).toLocaleDateString(locale) : ''
    if (start && end) return `${start} – ${end}`
    return start || end || new Date(project.created_at).toLocaleDateString(locale)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={
          loading || projects.length > 0 ? (
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2" aria-label={t('newProject')}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('newProject')}</span>
            </Button>
          ) : undefined
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className={`${fieldClass} pl-9`}
        />
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-text-muted">{t('loadingProject')}</p>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('createProject')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary/40"
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
            >
              {project.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={project.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: project.color || '#667eea' }}
                >
                  {project.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">{project.name}</h2>
                  <IconMenu
                    label={t('editProject')}
                    items={[
                      { label: t('editProject'), onClick: () => openEdit(project) },
                      { label: t('deleteProject'), onClick: () => handleDeleteProject(project.id), danger: true },
                    ]}
                  />
                </div>
                <p className="line-clamp-1 text-sm text-text-secondary">
                  {project.description || t('noDescription')}
                </p>
                <p className="mt-2 text-xs text-text-muted">
                  {statusLabel(project.status)} · {dateLabel(project)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false)
          loadProjects()
        }}
      />

      <Dialog
        open={Boolean(editingProject)}
        title={t('editProjectTitle')}
        onClose={closeEdit}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeEdit}>
              {t('cancel')}
            </Button>
            <Button type="submit" form="edit-project-form" className="flex-1" disabled={uploadingLogo}>
              {uploadingLogo ? t('uploading') : t('updateProject')}
            </Button>
          </div>
        }
      >
        <form id="edit-project-form" onSubmit={handleUpdateProject} className="space-y-4">
          <label className="block text-sm text-text-secondary">
            {t('projectName')}
            <input
              required
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('projectNamePlaceholder')}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('description')}
            <textarea
              rows={3}
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              className={`${fieldClass} mt-1.5`}
              placeholder={t('descriptionPlaceholder')}
            />
          </label>
          <label className="block text-sm text-text-secondary">
            {t('logo')}
            <div className="mt-1.5 flex items-center gap-3">
              {formData.logo_file ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(formData.logo_file)} alt={t('logoPreviewAlt')} className="h-12 w-12 rounded-lg object-cover" />
              ) : editingProject?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editingProject.logo_url} alt={t('currentLogoAlt')} className="h-12 w-12 rounded-lg object-cover" />
              ) : null}
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-secondary">
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">{formData.logo_file ? formData.logo_file.name : t('chooseLogo')}</span>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
            </div>
          </label>
          <div>
            <p className="text-sm text-text-secondary">{t('color')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onClick={() => setFormData({ ...formData, color })}
                  className={`h-8 w-8 rounded-lg ${formData.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <label className="block text-sm text-text-secondary">
            {t('statusField')}
            <select
              value={formData.status}
              onChange={(event) => setFormData({ ...formData, status: event.target.value })}
              className={`${fieldClass} mt-1.5`}
            >
              <option value="planning">{t('status.planning')}</option>
              <option value="active">{t('status.active')}</option>
              <option value="in-progress">{t('status.inProgress')}</option>
              <option value="on-hold">{t('status.onHold')}</option>
              <option value="completed">{t('status.completed')}</option>
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-text-secondary">
              {t('startDate')}
              <input
                type="date"
                value={formData.start_date}
                onChange={(event) => setFormData({ ...formData, start_date: event.target.value })}
                className={`${fieldClass} mt-1.5`}
              />
            </label>
            <label className="block text-sm text-text-secondary">
              {t('endDate')}
              <input
                type="date"
                value={formData.end_date}
                onChange={(event) => setFormData({ ...formData, end_date: event.target.value })}
                className={`${fieldClass} mt-1.5`}
              />
            </label>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
