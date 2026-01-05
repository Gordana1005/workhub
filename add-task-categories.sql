-- Add task categories feature
-- Run this in Supabase SQL Editor

-- 1. Add category column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category text;

-- 2. Create task_categories table for predefined categories per workspace
CREATE TABLE IF NOT EXISTS task_categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#667eea',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(workspace_id, name)
);

-- 3. Insert default categories
INSERT INTO task_categories (workspace_id, name, color)
SELECT DISTINCT 
  w.id as workspace_id,
  unnest(ARRAY['Development', 'Marketing', 'SEO Optimization', 'Design', 'Content', 'Bug Fix']) as name,
  unnest(ARRAY['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#ff6b6b']) as color
FROM workspaces w
ON CONFLICT (workspace_id, name) DO NOTHING;

-- 4. Create project_members table for assigning team to projects
CREATE TABLE IF NOT EXISTS project_members (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member',
  added_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(project_id, user_id)
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_task_categories_workspace ON task_categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- 6. Enable RLS policies for task_categories
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories in their workspaces"
  ON task_categories FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert categories"
  ON task_categories FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update categories"
  ON task_categories FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete categories"
  ON task_categories FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Enable RLS policies for project_members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project members in their workspaces"
  ON project_members FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage project members"
  ON project_members FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  );
