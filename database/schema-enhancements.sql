-- Schema Updates for Enhanced Features
-- Run this to add new columns and tables for the productivity app enhancements

-- 1. Add time estimates to tasks
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 2. Add recurring task fields
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly', 'custom'
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE;

-- 3. Update subtasks table with order and estimated time
ALTER TABLE subtasks
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;

-- 4. Create task_notes table (for notes attached specifically to tasks)
CREATE TABLE IF NOT EXISTS task_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create sessions table (for time tracking sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  session_type TEXT DEFAULT 'work', -- 'work', 'break', 'meeting'
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in seconds
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Update notes table to support standalone notes (not just project-tied)
ALTER TABLE notes
ALTER COLUMN project_id DROP NOT NULL,
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 7. Create task_dependencies table (for task relationships)
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(task_id, depends_on_task_id)
);

-- 8. Add RLS policies for new tables

-- task_notes policies
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view task notes in their workspaces" ON task_notes;
CREATE POLICY "Users can view task notes in their workspaces" ON task_notes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_notes.task_id AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create task notes" ON task_notes;
CREATE POLICY "Users can create task notes" ON task_notes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_notes.task_id AND wm.user_id = auth.uid()
  )
);

-- sessions policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own sessions" ON sessions;
CREATE POLICY "Users can create own sessions" ON sessions FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE USING (user_id = auth.uid());

-- task_dependencies policies
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view task dependencies" ON task_dependencies;
CREATE POLICY "Users can view task dependencies" ON task_dependencies FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_dependencies.task_id AND wm.user_id = auth.uid()
  )
);

-- 9. Update existing notes policies for workspace-scoped notes
DROP POLICY IF EXISTS "Users can create notes in their workspaces" ON notes;
CREATE POLICY "Users can create notes in their workspaces" ON notes FOR INSERT WITH CHECK (
  (project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspace_members wm 
    JOIN projects p ON p.workspace_id = wm.workspace_id 
    WHERE p.id = notes.project_id AND wm.user_id = auth.uid()
  ))
  OR
  (workspace_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = notes.workspace_id AND wm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update own notes" ON notes FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
CREATE POLICY "Users can delete own notes" ON notes FOR DELETE USING (author_id = auth.uid());

-- 10. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON notes(workspace_id);

-- Done! Your schema is now ready for enhanced features.
