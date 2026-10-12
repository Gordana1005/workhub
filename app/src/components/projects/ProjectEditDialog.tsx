'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { PROJECT_COLORS } from '@/lib/project-starters'
import { supabase } from '@/lib/supabase'
import { ProjectTile } from './ProjectCard'
import { statusKey, type ProjectSummary } from './projectUtils'

export type EditableProject = Pick<
  ProjectSummary,
  'id' | 'name' | 'description' | 'color' | 'status' | 'start_date' | 'end_date' | 'logo_url'
>

// The database only accepts these four values (projects_status_check); "on-hold" is stored with a hyphen.
const STATUS_OPTIONS = [
  ['active', 'active'],
  ['on-hold', 'onHold'],
  ['completed', 'completed'],
  ['archived', 'archived'],
] as const

const fieldClass =
  'w-full min-w-0 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50'

const day = (value: string | null) => (value ? value.split('T')[0] : '')

export default function ProjectEditDialog({
  project,
  createdBy,
  onClose,
  onSaved,
}: {
  project: EditableProject | null
  createdBy?: string | null
  onClose: () => void
  onSaved: (project: EditableProject) => void
}) {
  const t = useTranslations('pages.projects')
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#667eea',
    status: 'active',
    start_date: '',
    end_date: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!project) return
    setForm({
      name: project.name,
      description: project.description || '',
      color: project.color || '#667eea',
      status: project.status === 'on_hold' ? 'on-hold' : project.status,
      start_date: day(project.start_date),
      end_date: day(project.end_date),
    })
    setLogoFile(null)
    setRemoveLogo(false)
    setSaving(false)
    setError(null)
  }, [project])

  const previewUrl = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : null), [logoFile])
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (!project) return null

  const colors = PROJECT_COLORS.includes(form.color as (typeof PROJECT_COLORS)[number])
    ? [...PROJECT_COLORS]
    : [form.color, ...PROJECT_COLORS]

  const statusOptions: { value: string; label: string }[] = STATUS_OPTIONS.map(([value, key]) => ({
    value,
    label: t(`status.${key}`),
  }))
  if (!statusOptions.some((option) => option.value === form.status)) {
    const key = statusKey(form.status)
    statusOptions.push({ value: form.status, label: key ? t(`status.${key}`) : form.status })
  }

  const handleLogo = (file: File | undefined) => {
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      setError(t('fileTooLarge'))
      return
    }
    setError(null)
    setRemoveLogo(false)
    setLogoFile(file)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!project || saving || !form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      let logoUrl = removeLogo ? null : project.logo_url
      if (logoFile) {
        const ext = logoFile.name.split('.').pop() || 'png'
        const path = `project-logos/${project.id}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('project-assets').upload(path, logoFile)
        if (uploadError) throw uploadError
        logoUrl = supabase.storage.from('project-assets').getPublicUrl(path).data.publicUrl
      }

      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: project.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          color: form.color,
          status: form.status,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          logo_url: logoUrl,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('updateFailedShort'))
      onSaved({
        id: project.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        logo_url: logoUrl,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('updateFailedShort'))
    } finally {
      setSaving(false)
    }
  }

  const close = () => {
    if (!saving) onClose()
  }

  const shownLogo = removeLogo ? null : previewUrl || project.logo_url

  return (
    <Dialog
      open
      title={t('editProjectTitle')}
      onClose={close}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={close} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button type="submit" form="edit-project-form" className="w-full sm:w-auto" disabled={saving || !form.name.trim()}>
            {saving ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      }
    >
      <form id="edit-project-form" onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <label className="block text-sm font-medium text-text-secondary">
          {t('projectName')}
          <input
            required
            autoFocus
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={`${fieldClass} mt-1.5`}
            placeholder={t('namePlaceholder')}
          />
        </label>

        <label className="block text-sm font-medium text-text-secondary">
          {t('description')}
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={`${fieldClass} mt-1.5 resize-y`}
            placeholder={t('descriptionShortPlaceholder')}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-text-secondary">
            {t('statusField')}
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className={`${fieldClass} mt-1.5`}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0 text-sm font-medium text-text-secondary">
              {t('startDate')}
              <input
                type="date"
                value={form.start_date}
                onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                className={`${fieldClass} mt-1.5`}
              />
            </label>
            <label className="block min-w-0 text-sm font-medium text-text-secondary">
              {t('endDate')}
              <input
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(event) => setForm({ ...form, end_date: event.target.value })}
                className={`${fieldClass} mt-1.5`}
              />
            </label>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-text-secondary">{t('color')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                aria-pressed={form.color === color}
                onClick={() => setForm({ ...form, color })}
                className={`h-8 w-8 rounded-lg transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                  form.color === color ? 'ring-2 ring-text-primary ring-offset-2 ring-offset-surface' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-text-secondary">{t('logo')}</p>
          <div className="mt-2 flex items-center gap-3">
            {shownLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownLogo} alt={t('logoPreviewAlt')} className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover" />
            ) : (
              <ProjectTile project={{ name: form.name || project.name, color: form.color, logo_url: null }} size="lg" />
            )}
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover focus-within:ring-2 focus-within:ring-primary">
              <ImagePlus className="h-4 w-4 shrink-0" aria-hidden />
              <span>{t('chooseLogo')}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => handleLogo(event.target.files?.[0])}
              />
            </label>
            {shownLogo ? (
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="gap-2"
                onClick={() => {
                  setLogoFile(null)
                  setRemoveLogo(true)
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t('removeLogo')}</span>
                <span className="sr-only sm:hidden">{t('removeLogo')}</span>
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-text-muted">{t('logoHint')}</p>
        </div>

        {createdBy ? (
          <p className="border-t border-border pt-3 text-xs text-text-muted">
            {t('createdBy')}: {createdBy}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
