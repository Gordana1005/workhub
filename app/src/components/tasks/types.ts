// Shared types for the tasks screens (list, board, calendar, detail panel)

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: Priority;
  due_date?: string | null;
  category?: string | null;
  assignee_id?: string | null;
  assignee?: { id?: string; username: string } | null;
  project_id?: string | null;
  project?: { name?: string; color?: string } | null;
  estimated_hours?: number | null;
  is_completed?: boolean;
  completed_at?: string | null;
  created_at?: string;
  tags?: string[] | null;
  recurrence_pattern?: unknown;
  /** Set on subtasks only (they never appear in task lists). */
  parent_task_id?: string | null;
  /** Subtask counts carried by list responses (top-level tasks). */
  subtask_total?: number;
  subtask_done?: number;
  /** Total time logged on the task by everyone, in seconds (only when > 0). */
  logged_seconds?: number;
}

export interface Column {
  id: string;
  title: string;
  color: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  color?: string | null;
}

export interface MemberOption {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string | null;
  role?: string;
}
