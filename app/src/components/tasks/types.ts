// Shared types for Kanban board components

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string | null;
  category?: string | null;
  assignee_id?: string | null;
  assignee?: { id?: string; username: string } | null;
  project?: { name?: string; color?: string } | null;
  estimated_hours?: number | null;
}

export interface Column {
  id: string;
  title: string;
  color: string;
}
