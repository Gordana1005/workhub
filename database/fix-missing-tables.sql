-- ============================================================
-- FIX MISSING TABLES AND COLUMNS FOR WORKHUB
-- Run this in your Supabase SQL Editor to fix console errors
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CREATE task_notes TABLE (for comments on tasks)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add author_id as alias if user_id column doesn't work with existing code
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'task_notes' AND column_name = 'author_id') THEN
    -- If user_id exists but author_id doesn't, we're fine - code uses user_id
    NULL;
  END IF;
END $$;

-- Indexes for task_notes
CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_user_id ON task_notes(user_id);

-- RLS for task_notes
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
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_notes.task_id AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own task notes" ON task_notes;
CREATE POLICY "Users can update own task notes" ON task_notes FOR UPDATE USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete own task notes" ON task_notes;
CREATE POLICY "Users can delete own task notes" ON task_notes FOR DELETE USING (
  user_id = auth.uid()
);

-- ============================================================
-- 2. CREATE task_dependencies TABLE (for task relationships)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(task_id, depends_on_task_id),
  CONSTRAINT task_dependencies_no_self CHECK (task_id != depends_on_task_id)
);

-- Indexes for task_dependencies
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(depends_on_task_id);

-- RLS for task_dependencies
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view task dependencies" ON task_dependencies;
CREATE POLICY "Users can view task dependencies" ON task_dependencies FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_dependencies.task_id AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create task dependencies" ON task_dependencies;
CREATE POLICY "Users can create task dependencies" ON task_dependencies FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_dependencies.task_id AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete task dependencies" ON task_dependencies;
CREATE POLICY "Users can delete task dependencies" ON task_dependencies FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_dependencies.task_id AND wm.user_id = auth.uid()
  )
);

-- ============================================================
-- 3. ADD MISSING COLUMNS TO tasks TABLE
-- ============================================================
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT,
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS category TEXT;

-- ============================================================
-- 4. CREATE sessions TABLE (for time tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  session_type TEXT DEFAULT 'work',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace_id ON sessions(workspace_id);

-- RLS for sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own sessions" ON sessions;
CREATE POLICY "Users can create own sessions" ON sessions FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;
CREATE POLICY "Users can delete own sessions" ON sessions FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 5. UPDATE notes TABLE (add workspace_id for standalone notes)
-- ============================================================
DO $$
BEGIN
  -- Make project_id optional (allow standalone notes)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'notes' AND column_name = 'project_id' AND is_nullable = 'NO') THEN
    ALTER TABLE notes ALTER COLUMN project_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE notes
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Index for workspace_id on notes
CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON notes(workspace_id);

-- ============================================================
-- 6. ADD OTHER USEFUL INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- ============================================================
-- 7. CREATE task_templates TABLE (for task templates)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  template_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for task_templates
CREATE INDEX IF NOT EXISTS idx_task_templates_workspace_id ON task_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_created_by ON task_templates(created_by);

-- RLS for task_templates
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view templates in their workspaces" ON task_templates;
CREATE POLICY "Users can view templates in their workspaces" ON task_templates FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = task_templates.workspace_id AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create templates in their workspaces" ON task_templates;
CREATE POLICY "Users can create templates in their workspaces" ON task_templates FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = task_templates.workspace_id AND wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own templates" ON task_templates;
CREATE POLICY "Users can update own templates" ON task_templates FOR UPDATE USING (
  created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete own templates" ON task_templates;
CREATE POLICY "Users can delete own templates" ON task_templates FOR DELETE USING (
  created_by = auth.uid()
);

-- ============================================================
-- 8. VERIFY INSTALLATION
-- ============================================================
DO $$
DECLARE
  missing_tables TEXT := '';
BEGIN
  -- Check task_notes
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_notes') THEN
    missing_tables := missing_tables || 'task_notes, ';
  END IF;
  
  -- Check task_dependencies
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_dependencies') THEN
    missing_tables := missing_tables || 'task_dependencies, ';
  END IF;
  
  -- Check sessions
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sessions') THEN
    missing_tables := missing_tables || 'sessions, ';
  END IF;

  -- Check task_templates
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_templates') THEN
    missing_tables := missing_tables || 'task_templates, ';
  END IF;
  
  IF missing_tables != '' THEN
    RAISE NOTICE 'WARNING: Some tables could not be created: %', missing_tables;
  ELSE
    RAISE NOTICE 'SUCCESS: All required tables have been created!';
  END IF;
END $$;

-- ============================================================
-- DONE! Your database schema is now complete.
-- ============================================================
