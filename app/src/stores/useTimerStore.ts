import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { localDateString } from '@/lib/date'
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
      // a fresh run always starts from zero (stop() used to leave the old total behind)
      time: get().isRunning ? get().time : 0,
      isRunning: true,
      currentTaskId: taskId || null,
      currentProjectId: projectId || null
    })
  },
  stop: async () => {
    const { time, currentTaskId, currentProjectId, isRunning } = get()
    if (!isRunning) return

    set({ isRunning: false, time: 0, currentTaskId: null, currentProjectId: null })

    // Get current user and workspace
    const { data: { user } } = await supabase.auth.getUser()
    const { currentWorkspace } = useWorkspaceStore.getState()

    if (user && currentWorkspace && time > 0) {
      const { error } = await supabase.from('time_entries').insert({
        workspace_id: currentWorkspace.id,
        project_id: currentProjectId,
        task_id: currentTaskId,
        user_id: user.id,
        duration: time,
        date: localDateString()
      })
      if (error) console.error('Failed to save time entry:', error)
      // Lets open task panels refresh their "Time" section
      else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trackwork:time-entry-saved', { detail: { taskId: currentTaskId } }))
      }
    }
  },
  reset: () => set({ time: 0, isRunning: false, currentTaskId: null, currentProjectId: null }),
  tick: () => set((state) => ({ time: state.time + 1 })),
  setCurrentTask: (taskId) => set({ currentTaskId: taskId }),
  setCurrentProject: (projectId) => set({ currentProjectId: projectId }),
}))