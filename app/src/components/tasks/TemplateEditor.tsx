import { useState } from 'react'
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
        throw new Error('Failed to save template')
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Failed to save template')
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-slate-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white">
            {template?.id ? 'Edit Template' : 'Create Template'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Template Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Template Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Template Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Template Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                placeholder="e.g., Development, Marketing, Design"
              />
            </div>
          </div>

          {/* Task Defaults */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Task Defaults</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Default Title
              </label>
              <input
                type="text"
                value={formData.template_data.title}
                onChange={(e) => handleTemplateDataChange('title', e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                placeholder="Task title or prefix"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Default Description
              </label>
              <textarea
                value={formData.template_data.description}
                onChange={(e) => handleTemplateDataChange('description', e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                rows={4}
                placeholder="Include headings, checklists, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Default Priority
                </label>
                <select
                  value={formData.template_data.priority}
                  onChange={(e) => handleTemplateDataChange('priority', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  value={formData.template_data.estimated_hours}
                  onChange={(e) => handleTemplateDataChange('estimated_hours', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Default Category
              </label>
              <input
                type="text"
                value={formData.template_data.category}
                onChange={(e) => handleTemplateDataChange('category', e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Default Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  placeholder="Add tag and press Enter"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.template_data.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-slate-800 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-400"
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
                <label className="block text-sm font-medium text-slate-300">
                  Default Subtasks
                </label>
                <button
                  type="button"
                  onClick={addSubtask}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Subtask
                </button>
              </div>
              <div className="space-y-3">
                {formData.template_data.subtasks.map((subtask, index) => (
                  <div key={index} className="p-3 bg-slate-800 rounded-lg space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={subtask.title}
                        onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                        className="flex-1 px-3 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                        placeholder="Subtask title"
                      />
                      <button
                        type="button"
                        onClick={() => removeSubtask(index)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                    <textarea
                      value={subtask.description}
                      onChange={(e) => updateSubtask(index, 'description', e.target.value)}
                      className="w-full px-3 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                      rows={2}
                      placeholder="Subtask description (optional)"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : template?.id ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
