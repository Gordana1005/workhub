import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'

interface TemplateData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_hours: number
  category: string
  tags: string[]
  subtasks: Array<{ title: string; description: string }>
}

interface TaskTemplate {
  id?: string
  name: string
  description: string
  category: string
  template_data: TemplateData
}

interface TemplateEditorProps {
  template?: TaskTemplate | null
  workspaceId: string
  onClose: () => void
  onSave: () => void
}

export default function TemplateEditor({
  template,
  workspaceId,
  onClose,
  onSave
}: TemplateEditorProps) {
  const t = useTranslations('pages.tasks')
  const [formData, setFormData] = useState<TaskTemplate>({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || '',
    template_data: template?.template_data || {
      title: '',
      description: '',
      priority: 'medium',
      estimated_hours: 0,
      category: '',
      tags: [],
      subtasks: []
    }
  })

  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  const handleTemplateDataChange = (field: keyof TemplateData, value: any) => {
    setFormData({
      ...formData,
      template_data: {
        ...formData.template_data,
        [field]: value
      }
    })
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.template_data.tags.includes(tagInput.trim())) {
      handleTemplateDataChange('tags', [...formData.template_data.tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    handleTemplateDataChange(
      'tags',
      formData.template_data.tags.filter(t => t !== tag)
    )
  }

  const addSubtask = () => {
    handleTemplateDataChange('subtasks', [
      ...formData.template_data.subtasks,
      { title: '', description: '' }
    ])
  }

  const updateSubtask = (index: number, field: 'title' | 'description', value: string) => {
    const newSubtasks = [...formData.template_data.subtasks]
    newSubtasks[index][field] = value
    handleTemplateDataChange('subtasks', newSubtasks)
  }

  const removeSubtask = (index: number) => {
    handleTemplateDataChange(
      'subtasks',
      formData.template_data.subtasks.filter((_, i) => i !== index)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = '/api/templates'
      const method = template?.id ? 'PATCH' : 'POST'
      const body = template?.id
        ? { ...formData, id: template.id }
        : { ...formData, workspace_id: workspaceId }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(t('saveTemplateFailed'))
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving template:', error)
      alert(t('saveTemplateFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-surface shadow-xl w-full max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 p-4 sm:p-6 border-b border-border">
          <h2 className="min-w-0 text-lg font-bold text-text-primary sm:text-2xl">
            {template?.id ? t('editTemplate') : t('createTemplate')}
          </h2>
          <button
            type="button"
            aria-label={t('close')}
            onClick={onClose}
            className="shrink-0 p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {/* Template Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">{t('templateInformation')}</h3>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('templateName')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('templateDescription')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('templateCategory')}
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary"
                placeholder={t('templateCategoryExample')}
              />
            </div>
          </div>

          {/* Task Defaults */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">{t('taskDefaults')}</h3>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('defaultTitle')}
              </label>
              <input
                type="text"
                value={formData.template_data.title}
                onChange={(e) => handleTemplateDataChange('title', e.target.value)}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary"
                placeholder={t('defaultTitlePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('defaultDescription')}
              </label>
              <textarea
                value={formData.template_data.description}
                onChange={(e) => handleTemplateDataChange('description', e.target.value)}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary"
                rows={4}
                placeholder={t('defaultDescriptionPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('defaultPriority')}
                </label>
                <select
                  value={formData.template_data.priority}
                  onChange={(e) => handleTemplateDataChange('priority', e.target.value)}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary"
                >
                  <option value="low">{t('priorityLow')}</option>
                  <option value="medium">{t('priorityMedium')}</option>
                  <option value="high">{t('priorityHigh')}</option>
                  <option value="urgent">{t('priorityUrgent')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('estimatedHours')}
                </label>
                <input
                  type="number"
                  value={formData.template_data.estimated_hours}
                  onChange={(e) => handleTemplateDataChange('estimated_hours', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('defaultCategory')}
              </label>
              <input
                type="text"
                value={formData.template_data.category}
                onChange={(e) => handleTemplateDataChange('category', e.target.value)}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {t('defaultTags')}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="min-w-0 flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-text-primary"
                  placeholder={t('addTagPlaceholder')}
                />
                <button
                  type="button"
                  onClick={addTag}
                  aria-label={t('addTagPlaceholder')}
                  className="shrink-0 px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg transition-colors text-white"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.template_data.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-surface-hover text-text-primary rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={t('delete')}
                      className="hover:text-danger"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-secondary">
                  {t('defaultSubtasks')}
                </label>
                <button
                  type="button"
                  onClick={addSubtask}
                  className="px-3 py-1 bg-primary hover:bg-primary/90 rounded-lg text-sm flex items-center gap-1 transition-colors text-white"
                >
                  <Plus className="w-4 h-4" />
                  {t('addSubtaskButton')}
                </button>
              </div>
              <div className="space-y-3">
                {formData.template_data.subtasks.map((subtask, index) => (
                  <div key={index} className="p-3 bg-surface-hover rounded-lg space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={subtask.title}
                        onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                        className="min-w-0 flex-1 px-3 py-1 bg-surface border border-border rounded text-text-primary text-sm"
                        placeholder={t('subtaskTitle')}
                      />
                      <button
                        type="button"
                        onClick={() => removeSubtask(index)}
                        aria-label={t('delete')}
                        className="shrink-0 p-2 hover:bg-surface-hover rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-danger" />
                      </button>
                    </div>
                    <textarea
                      value={subtask.description}
                      onChange={(e) => updateSubtask(index, 'description', e.target.value)}
                      className="w-full px-3 py-1 bg-surface border border-border rounded text-text-primary text-sm"
                      rows={2}
                      placeholder={t('subtaskDescriptionOptional')}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          </div>

          {/* Actions */}
          <div className="flex shrink-0 justify-end gap-3 border-t border-border bg-surface p-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-secondary text-text-primary hover:bg-surface-hover rounded-lg transition-colors border border-border"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 text-white"
            >
              {saving ? t('saving') : template?.id ? t('updateTemplate') : t('createTemplate')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
