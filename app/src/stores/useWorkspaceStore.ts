import { create } from 'zustand'

interface Workspace {
  id: string
  name: string
  owner_id: string
  category?: string
  color?: string
  description?: string
  created_at: string
  userRole?: 'admin' | 'member'
  memberCount?: number
  owner?: {
    username: string
    avatar_url?: string
  }
}

interface WorkspaceState {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  loading: boolean
  error: string | null

  // Actions
  hydrateWorkspace: () => void
  fetchWorkspaces: () => Promise<void>
  createWorkspace: (name: string, category?: string, color?: string, description?: string) => Promise<Workspace | null>
  setCurrentWorkspace: (workspace: Workspace | null) => void
  updateWorkspace: (id: string, updates: { name?: string; category?: string; color?: string; description?: string }) => Promise<boolean>
  deleteWorkspace: (id: string) => Promise<boolean>
  clearError: () => void
}

// localStorage can throw (private mode / blocked storage) or hold corrupt JSON - never let that crash the app
function readSavedWorkspace(): Workspace | null {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem('currentWorkspace') || 'null')
  } catch {
    return null
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  // Start empty so server HTML and the first client render agree (no hydration mismatch);
  // hydrateWorkspace() restores the saved selection right after mount.
  currentWorkspace: null,
  loading: false,
  error: null,

  hydrateWorkspace: () => {
    const saved = readSavedWorkspace()
    if (saved) set((state) => (state.currentWorkspace ? state : { currentWorkspace: saved }))
  },

  fetchWorkspaces: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/workspaces')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch workspaces')
      }

      const fetched = data.workspaces || []
      const savedWorkspace = readSavedWorkspace()
      // Use the fresh server copy (up-to-date name/role/memberCount) instead of the cached one
      const savedStillValid = savedWorkspace ? fetched.find((w: Workspace) => w.id === savedWorkspace.id) : null

      // Keep the same object when nothing changed: screens that depend on the workspace object (not just its
      // id) would otherwise reload their data a second time right after the first paint.
      const existing = get().currentWorkspace
      const nextCurrent =
        savedStillValid && existing && existing.id === savedStillValid.id && JSON.stringify(existing) === JSON.stringify(savedStillValid)
          ? existing
          : savedStillValid || null

      set({
        workspaces: fetched,
        currentWorkspace: nextCurrent,
        loading: false
      })

      // Drop stale workspace selection from a previous account
      if (typeof window !== 'undefined') {
        try {
          if (savedStillValid) localStorage.setItem('currentWorkspace', JSON.stringify(savedStillValid))
          else localStorage.removeItem('currentWorkspace')
        } catch {}
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch workspaces',
        loading: false
      })
    }
  },

  createWorkspace: async (name: string, category?: string, color?: string, description?: string) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, color, description })
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
      try {
        localStorage.setItem('currentWorkspace', JSON.stringify(workspace))
      } catch {}
    }
  },

  updateWorkspace: async (id: string, updates: { name?: string; category?: string; color?: string; description?: string }) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/workspaces/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update workspace')
      }

      // The PUT response is the raw row (no userRole / memberCount) - merge so those aren't lost
      set(state => ({
        workspaces: state.workspaces.map(w =>
          w.id === id ? { ...w, ...data.workspace } : w
        ),
        currentWorkspace: state.currentWorkspace?.id === id
          ? { ...state.currentWorkspace, ...data.workspace }
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
        const data = await response.json().catch(() => ({}))
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