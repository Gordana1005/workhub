'use client'

import { useState, useEffect, useRef } from 'react'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'
import { ChevronDown, Plus, Check, Building2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

export default function WorkspaceSwitcher() {
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    loading,
  } = useWorkspaceStore()
  
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleWorkspaceSwitch = (workspace: typeof currentWorkspace) => {
    setCurrentWorkspace(workspace)
    setIsOpen(false)
  }

  if (!mounted) {
    return (
      <div className="w-64 h-12 bg-slate-800/50 rounded-xl animate-pulse" />
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="w-full min-w-[240px] max-w-[280px] px-4 py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all duration-200 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {loading ? (
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin flex-shrink-0" />
          ) : (
            <>
              {currentWorkspace?.color ? (
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-slate-700"
                  style={{ backgroundColor: currentWorkspace.color }}
                />
              ) : (
                <Building2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
              )}
            </>
          )}
          
          <div className="flex-1 min-w-0 text-left">
            <div className="font-medium text-white text-sm truncate">
              {currentWorkspace?.name || 'Select Workspace'}
            </div>
            {currentWorkspace?.category && (
              <div className="text-xs text-slate-400 truncate">
                {currentWorkspace.category}
              </div>
            )}
          </div>
        </div>

        <ChevronDown 
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Your Workspaces
              </div>
            </div>

            {/* Workspaces List */}
            <div className="max-h-[400px] overflow-y-auto">
              {workspaces.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No workspaces found</p>
                  <p className="text-slate-500 text-xs mt-1">Create your first workspace</p>
                </div>
              ) : (
                <div className="py-2">
                  {workspaces.map((workspace) => {
                    const isActive = currentWorkspace?.id === workspace.id
                    
                    return (
                      <button
                        key={workspace.id}
                        onClick={() => handleWorkspaceSwitch(workspace)}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                          isActive
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'hover:bg-slate-700/50 text-white'
                        }`}
                      >
                        {/* Color Indicator */}
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            isActive ? 'ring-2 ring-blue-400/50' : 'ring-1 ring-slate-600'
                          }`}
                          style={{ backgroundColor: workspace.color || '#667eea' }}
                        />

                        {/* Workspace Info */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {workspace.name}
                            </span>
                            {workspace.userRole === 'admin' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                          {workspace.category && (
                            <div className="text-xs text-slate-400 truncate">
                              {workspace.category}
                            </div>
                          )}
                          {workspace.memberCount && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>

                        {/* Active Indicator */}
                        {isActive && (
                          <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-slate-700">
              <Link
                href="/dashboard/workspaces"
                className="w-full px-4 py-3 flex items-center gap-3 text-blue-400 hover:bg-slate-700/50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Manage Workspaces</span>
              </Link>
              
              <Link
                href="/dashboard/workspaces?create=true"
                className="w-full px-4 py-3 flex items-center gap-3 text-green-400 hover:bg-slate-700/50 transition-colors border-t border-slate-700/50"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Create Workspace</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}