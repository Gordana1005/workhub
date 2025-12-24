export * from './database'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  workspace_id: string
  name: string
  description: string | null
  color: string | null
  status: string
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  is_completed: boolean
  assignee_id: string | null
  created_at: string
  updated_at: string
  project?: {
    name: string
    color: string
  }
}

export interface TimeEntry {
  id: string
  user_id: string
  task_id: string | null
  project_id: string | null
  description: string | null
  start_time: string
  end_time: string | null
  duration: number
  created_at: string
}

export interface DashboardStats {
  tasksCompleted: number
  timeLogged: number
  activeTasks: number
  completionRate: number
}
