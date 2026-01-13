'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Building2, Palette } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

interface WorkspaceFormDialogProps {
  isOpen: boolean
  onClose: () => void
  workspace?: {
    id: string
    name: string
    category?: string
    color?: string
    description?: string
  } | null
}

const WORKSPACE_CATEGORIES = [
  { value: 'personal', label: 'Personal', icon: '👤' },
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'client', label: 'Client', icon: '🤝' },
  { value: 'team', label: 'Team', icon: '👥' },
  { value: 'freelance', label: 'Freelance', icon: '🚀' },
  { value: 'education', label: 'Education', icon: '🎓' },
  { value: 'other', label: 'Other', icon: '📦' },
]

const COLOR_PRESETS = [
  { name: 'Indigo', value: '#667eea' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
]

export default function WorkspaceFormDialog({
  isOpen,
  onClose,
  workspace,
}: WorkspaceFormDialogProps) {
  const { createWorkspace, updateWorkspace } = useWorkspaceStore()
  
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('')
  const [color, setColor] = useState('#667eea')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load workspace data when editing
  useEffect(() => {
    if (workspace) {
      setName(workspace.name)
      setCategory(workspace.category || '')
      setColor(workspace.color || '#667eea')
      setDescription(workspace.description || '')
    } else {
      // Reset form for new workspace
      setName('')
      setCategory('')
      setColor('#667eea')
      setDescription('')
    }
    setError(null)
  }, [workspace, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Workspace name is required')
      return
    }

    setLoading(true)

    try {
      if (workspace) {
        // Update existing workspace
        await updateWorkspace(workspace.id, {
          name: name.trim(),
          category: category || undefined,
          color,
          description: description.trim() || undefined,
        })
      } else {
        // Create new workspace
        await createWorkspace(
          name.trim(),
          category || undefined,
          color,
          description.trim() || undefined
        )
      }
      
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save workspace')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-surface/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden mt-20 sm:mt-0"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {workspace ? 'Edit Workspace' : 'Create Workspace'}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {workspace ? 'Update your workspace details' : 'Set up a new workspace'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-2 hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Form (scrollable content) */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
              <form onSubmit={handleSubmit}>
                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Workspace Name */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Workspace Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., My Company, Personal Projects"
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-50"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {WORKSPACE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                        disabled={loading}
                        className={`px-4 py-2.5 rounded-xl border transition-all text-sm font-medium disabled:opacity-50 ${
                          category === cat.value
                            ? 'bg-primary/20 border-primary/50 text-primary'
                            : 'bg-surface border-white/10 text-text-secondary hover:border-white/20 hover:bg-surface-hover'
                        }`}
                      >
                        <span className="mr-2">{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    <Palette className="w-4 h-4 inline mr-1" />
                    Workspace Color
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setColor(preset.value)}
                        disabled={loading}
                        className={`group relative h-12 rounded-xl transition-all disabled:opacity-50 ${
                          color === preset.value
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.value }}
                      >
                        {color === preset.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-slate-900" />
                            </div>
                          </div>
                        )}
                        <span className="sr-only">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      disabled={loading}
                      className="w-12 h-12 rounded-xl cursor-pointer disabled:opacity-50 bg-slate-900 border border-slate-700"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#667eea"
                      disabled={loading}
                      className="flex-1 px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-50 font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this workspace for?"
                    rows={3}
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none disabled:opacity-50"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-surface hover:bg-surface-hover text-white rounded-xl border border-white/10 transition-colors disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>{workspace ? 'Update' : 'Create'} Workspace</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
