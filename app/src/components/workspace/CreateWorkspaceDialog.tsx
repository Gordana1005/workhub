'use client'

import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { Button } from '@/components/ui/Button'
import { Plus, Loader2 } from 'lucide-react'

interface CreateWorkspaceDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateWorkspaceDialog({ isOpen, onClose }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createWorkspace, error, clearError } = useWorkspaceStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    clearError()

    const workspace = await createWorkspace(name.trim())

    if (workspace) {
      setName('')
      onClose()
    }

    setIsSubmitting(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Create New Workspace</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="workspace-name" className="block text-sm font-medium text-text-secondary mb-2">
              Workspace Name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter workspace name..."
              className="w-full px-4 py-3 rounded-xl shadow-neumorphic-inset dark:shadow-neumorphic-dark-inset bg-surface border-0 focus:outline-none focus:ring-2 focus:ring-accent-blue"
              disabled={isSubmitting}
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}