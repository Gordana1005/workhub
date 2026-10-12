import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Plus } from 'lucide-react'
import { IconMenu } from '../ui/IconMenu'
import TemplateEditor from './TemplateEditor'

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
  id: string
  name: string
  description: string
  category: string
  template_data: TemplateData
  created_at: string
}

interface TemplateSelectorProps {
  workspaceId: string
  onClose: () => void
  onSelectTemplate: (templateData: TemplateData) => void
}

export default function TemplateSelector({
  workspaceId,
  onClose,
  onSelectTemplate
}: TemplateSelectorProps) {
  const t = useTranslations('pages.tasks')
  const [templates, setTemplates] = useState<TaskTemplate[]>([])

  const priorityLabel = (priority: string) => {
    if (priority === 'low') return t('priorityLow')
    if (priority === 'medium') return t('priorityMedium')
    if (priority === 'high') return t('priorityHigh')
    if (priority === 'urgent') return t('priorityUrgent')
    return priority
  }
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)

  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch(`/api/templates?workspace_id=${workspaceId}`)
      if (!response.ok) throw new Error('Failed to load templates')
      
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadTemplates()
  }, [workspaceId, loadTemplates])

  const handleSelectTemplate = (template: TaskTemplate) => {
    onSelectTemplate(template.template_data)
    onClose()
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(t('confirmDeleteTemplate'))) return

    try {
      const response = await fetch(`/api/templates?id=${templateId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete template')
      
      await loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert(t('deleteTemplateFailed'))
    }
  }

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))]
  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory)

  const priorityColors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500'
  }

  if (showEditor) {
    return (
      <TemplateEditor
        template={editingTemplate}
        workspaceId={workspaceId}
        onClose={() => {
          setShowEditor(false)
          setEditingTemplate(null)
        }}
        onSave={() => {
          loadTemplates()
          setShowEditor(false)
          setEditingTemplate(null)
        }}
      />
    )
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
        className="bg-surface shadow-xl w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-text-primary sm:text-2xl">{t('taskTemplates')}</h2>
            <p className="text-text-secondary text-sm mt-1">
              {t('templateSelectorHelp')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={t('newTemplate')}
              onClick={() => {
                setEditingTemplate(null)
                setShowEditor(true)
              }}
              className="px-3 py-2 bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2 text-white sm:px-4"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('newTemplate')}</span>
            </button>
            <button
              type="button"
              aria-label={t('close')}
              onClick={onClose}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                type="button"
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-text-secondary hover:bg-surface-hover border border-border'
                }`}
              >
                {category === 'all' ? t('allTemplates') : category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-text-secondary">{t('loadingTemplates')}</div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="w-16 h-16 text-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-text-secondary mb-2">
                {t('noTemplates')}
              </h3>
              <p className="text-text-secondary mb-4">
                {t('noTemplatesHelp')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="p-4 bg-secondary hover:bg-surface-hover rounded-lg cursor-pointer transition-all border border-border hover:border-primary"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-text-primary">{template.name}</h3>
                        {template.category && (
                          <span className="px-2 py-0.5 bg-surface rounded text-xs text-text-secondary">
                            {template.category}
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-text-secondary line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 shrink-0">
                      <IconMenu
                        label={t('manage')}
                        items={[
                          {
                            label: t('editTemplateTitle'),
                            onClick: () => {
                              setEditingTemplate(template)
                              setShowEditor(true)
                            },
                          },
                          {
                            label: t('deleteTemplateTitle'),
                            danger: true,
                            onClick: () => handleDeleteTemplate(template.id),
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Template Preview */}
                  <div className="space-y-2">
                    {template.template_data.title && (
                      <div className="text-sm">
                        <span className="text-text-secondary">{t('labelTitle')} </span>
                        <span className="text-text-secondary">{template.template_data.title}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-text-secondary">{t('labelPriority')}</span>
                        <span className={`w-2 h-2 rounded-full ${priorityColors[template.template_data.priority]}`} />
                        <span className="text-text-secondary capitalize">{priorityLabel(template.template_data.priority)}</span>
                      </div>
                      
                      {template.template_data.estimated_hours > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-text-secondary">{t('labelEstimate')}</span>
                          <span className="text-text-secondary">{t('hoursShort', { hours: template.template_data.estimated_hours })}</span>
                        </div>
                      )}
                      
                      {template.template_data.subtasks.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-text-secondary">{t('labelSubtasks')}</span>
                          <span className="text-text-secondary">{template.template_data.subtasks.length}</span>
                        </div>
                      )}
                    </div>

                    {template.template_data.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.template_data.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-surface rounded text-xs text-text-secondary"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
