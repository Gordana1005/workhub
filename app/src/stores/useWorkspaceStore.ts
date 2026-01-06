import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface Workspace {
  id: string
  name: string
  owner_id: string
  created_at: string
  userRole?: 'admin' | 'member'
  memberCount?: number
  owner?: {
    full_name: string
    avatar_url?: string
  }
}

interface WorkspaceState {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  loading: boolean
  error: string | null

  // Actions
  fetchWorkspaces: () => Promise<void>
  createWorkspace: (name: string) => Promise<Workspace | null>
  setCurrentWorkspace: (workspace: Workspace | null) => void
  updateWorkspace: (id: string, name: string) => Promise<boolean>
  deleteWorkspace: (id: string) => Promise<boolean>
  clearError: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentWorkspace') || 'null') : null,
  loading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/workspaces')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch workspaces')
      }

      set({
        workspaces: data.workspaces || [],
        loading: false
      })

      // Restore current workspace from localStorage if it exists
      const savedWorkspace = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentWorkspace') || 'null') : null
      if (savedWorkspace && data.workspaces?.find((w: Workspace) => w.id === savedWorkspace.id)) {
        set({ currentWorkspace: savedWorkspace })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch workspaces',
        loading: false
      })
    }
  },

  createWorkspace: async (name: string) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create workspace')
      }

      const newWorkspace = data.workspace
      set(state => ({
        workspaces: [...state.workspaces, newWorkspace],
        currentWorkspace: newWorkspace,
        loading: false
      }))

      return newWorkspace
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create workspace',
        loading: false
      })
      return null
    }
  },

  setCurrentWorkspace: (workspace) => {
    set({ currentWorkspace: workspace })
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentWorkspace', JSON.stringify(workspace))
    }
  },

  updateWorkspace: async (id: string, name: string) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/workspaces/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update workspace')
      }

      set(state => ({
        workspaces: state.workspaces.map(w =>
          w.id === id ? data.workspace : w
        ),
        currentWorkspace: state.currentWorkspace?.id === id
          ? data.workspace
          : state.currentWorkspace,
        loading: false
      }))

      return true
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update workspace',
        loading: false
      })
      return false
    }
  },

  deleteWorkspace: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/workspaces/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete workspace')
      }

      set(state => ({
        workspaces: state.workspaces.filter(w => w.id !== id),
        currentWorkspace: state.currentWorkspace?.id === id
          ? null
          : state.currentWorkspace,
        loading: false
      }))

      return true
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete workspace',
        loading: false
      })
      return false
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))

export default useWorkspaceStore