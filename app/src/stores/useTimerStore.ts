import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from './useWorkspaceStore'

interface TimerStore {
  time: number // in seconds
  isRunning: boolean
  currentTaskId: string | null
  currentProjectId: string | null
  start: (taskId?: string, projectId?: string) => void
  stop: () => Promise<void>
  reset: () => void
  tick: () => void
  setCurrentTask: (taskId: string | null) => void
  setCurrentProject: (projectId: string | null) => void
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  time: 0,
  isRunning: false,
  currentTaskId: null,
  currentProjectId: null,
  start: (taskId, projectId) => {
    set({
      isRunning: true,
      currentTaskId: taskId || null,
      currentProjectId: projectId || null
    })
  },
  stop: async () => {
    const { time, currentTaskId, currentProjectId, isRunning } = get()
    if (!isRunning) return

    set({ isRunning: false })

    // Get current user and workspace
    const { data: { user } } = await supabase.auth.getUser()
    const { currentWorkspace } = useWorkspaceStore.getState()

    if (user && currentWorkspace && time > 0) {
      await supabase.from('time_entries').insert({
        workspace_id: currentWorkspace.id,
        project_id: currentProjectId,
        task_id: currentTaskId,
        user_id: user.id,
        duration: time,
        date: new Date().toISOString().split('T')[0]
      })
    }
  },
  reset: () => set({ time: 0, isRunning: false, currentTaskId: null, currentProjectId: null }),
  tick: () => set((state) => ({ time: state.time + 1 })),
  setCurrentTask: (taskId) => set({ currentTaskId: taskId }),
  setCurrentProject: (projectId) => set({ currentProjectId: projectId }),
}))