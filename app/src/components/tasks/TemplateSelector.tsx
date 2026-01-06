import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Trash2, Edit, Plus } from 'lucide-react'
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
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [workspaceId])

  const loadTemplates = async () => {
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
  }

  const handleSelectTemplate = (template: TaskTemplate) => {
    onSelectTemplate(template.template_data)
    onClose()
  }

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/templates?id=${templateId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete template')
      
      await loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Failed to delete template')
    }
  }

  const handleEditTemplate = (template: TaskTemplate, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTemplate(template)
    setShowEditor(true)
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Task Templates</h2>
            <p className="text-slate-400 text-sm mt-1">
              Select a template to create a task with predefined settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingTemplate(null)
                setShowEditor(true)
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {category === 'all' ? 'All Templates' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">Loading templates...</div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="w-16 h-16 text-slate-700 mb-4" />
              <h3 className="text-lg font-semibold text-slate-300 mb-2">
                No templates found
              </h3>
              <p className="text-slate-500 mb-4">
                Create your first template to speed up task creation
              </p>
              <button
                onClick={() => {
                  setEditingTemplate(null)
                  setShowEditor(true)
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-all border border-slate-700 hover:border-blue-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{template.name}</h3>
                        {template.category && (
                          <span className="px-2 py-0.5 bg-slate-900 rounded text-xs text-slate-400">
                            {template.category}
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => handleEditTemplate(template, e)}
                        className="p-1.5 hover:bg-slate-600 rounded transition-colors"
                        title="Edit template"
                      >
                        <Edit className="w-4 h-4 text-slate-400" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                        className="p-1.5 hover:bg-slate-600 rounded transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Template Preview */}
                  <div className="space-y-2">
                    {template.template_data.title && (
                      <div className="text-sm">
                        <span className="text-slate-500">Title: </span>
                        <span className="text-slate-300">{template.template_data.title}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Priority:</span>
                        <span className={`w-2 h-2 rounded-full ${priorityColors[template.template_data.priority]}`} />
                        <span className="text-slate-300 capitalize">{template.template_data.priority}</span>
                      </div>
                      
                      {template.template_data.estimated_hours > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Est:</span>
                          <span className="text-slate-300">{template.template_data.estimated_hours}h</span>
                        </div>
                      )}
                      
                      {template.template_data.subtasks.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Subtasks:</span>
                          <span className="text-slate-300">{template.template_data.subtasks.length}</span>
                        </div>
                      )}
                    </div>

                    {template.template_data.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.template_data.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-slate-900 rounded text-xs text-slate-400"
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
