-- Safe Database Schema Update for ProductivityHub
-- This script handles existing policies gracefully

-- Add missing columns to projects table (safe)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date timestamp with time zone;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date timestamp with time zone;

-- Migrate existing tasks to have workspace_id from their projects (safe)
UPDATE tasks
SET workspace_id = projects.workspace_id
FROM projects
WHERE tasks.project_id = projects.id AND tasks.workspace_id IS NULL;

-- Drop and recreate task policies safely
DO $$
BEGIN
    -- Drop existing task policies if they exist
    DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
    DROP POLICY IF EXISTS "Users can create tasks in their workspaces" ON tasks;
    DROP POLICY IF EXISTS "Users can update tasks in their workspaces" ON tasks;
    DROP POLICY IF EXISTS "Users can delete tasks in their workspaces" ON tasks;

    -- Create new task policies
    CREATE POLICY "Users can view tasks in their workspaces" ON tasks FOR SELECT USING (
      EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid())
    );

    CREATE POLICY "Users can create tasks in their workspaces" ON tasks FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid())
    );

    CREATE POLICY "Users can update tasks in their workspaces" ON tasks FOR UPDATE USING (
      EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid())
    );

    CREATE POLICY "Users can delete tasks in their workspaces" ON tasks FOR DELETE USING (
      EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid())
    );
END $$;

-- Drop and recreate time_entries policies safely
DO $$
BEGIN
    -- Drop existing time_entries policies if they exist
    DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
    DROP POLICY IF EXISTS "Users can view time entries in their workspaces" ON time_entries;
    DROP POLICY IF EXISTS "Users can create time entries in their workspaces" ON time_entries;

    -- Create new time_entries policies
    CREATE POLICY "Users can view time entries in their workspaces" ON time_entries FOR SELECT USING (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = time_entries.workspace_id AND user_id = auth.uid())
    );

    CREATE POLICY "Users can create time entries in their workspaces" ON time_entries FOR INSERT WITH CHECK (
      user_id = auth.uid() AND
      EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = time_entries.workspace_id AND user_id = auth.uid())
    );
END $$;