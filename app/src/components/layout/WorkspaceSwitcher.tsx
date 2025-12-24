'use client'

import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { ChevronDown, Plus, Loader2 } from 'lucide-react'
import CreateWorkspaceDialog from '@/components/workspace/CreateWorkspaceDialog'

export default function WorkspaceSwitcher() {
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    loading,
    error
  } = useWorkspaceStore()
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-dark-inset transition-all duration-200"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span className="font-medium text-text-primary">
              {currentWorkspace?.name || 'Select Workspace'}
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-surface shadow-neumorphic dark:shadow-neumorphic-dark rounded-xl z-50 overflow-hidden">
            <div className="py-2">
              {workspaces.length === 0 && !loading && (
                <div className="px-4 py-3 text-text-secondary text-sm">
                  No workspaces found
                </div>
              )}

              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => {
                    setCurrentWorkspace(workspace)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-accent-blue/10 transition-colors ${
                    currentWorkspace?.id === workspace.id
                      ? 'bg-accent-blue/20 text-accent-blue font-medium'
                      : 'text-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{workspace.name}</span>
                    {workspace.userRole === 'admin' && (
                      <span className="text-xs bg-accent-purple/20 text-accent-purple px-2 py-1 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  {workspace.memberCount && (
                    <span className="text-xs text-text-secondary">
                      {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              ))}

              <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
                <button
                  onClick={() => {
                    setShowCreateDialog(true)
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-accent-green/10 transition-colors flex items-center space-x-2 text-accent-green"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Workspace</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateWorkspaceDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </>
  )
}