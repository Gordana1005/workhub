-- Task Templates System
-- Allows users to create reusable task templates with predefined structure

-- Table: task_templates
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Template data stored as JSON
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure: {
  --   title: string,
  --   description: string,
  --   priority: 'low' | 'medium' | 'high' | 'urgent',
  --   estimated_hours: number,
  --   category: string,
  --   tags: string[],
  --   subtasks: Array<{title: string, description: string}>
  -- }
  
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  CONSTRAINT task_templates_name_workspace_unique UNIQUE(name, workspace_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_templates_workspace 
  ON task_templates(workspace_id);

CREATE INDEX IF NOT EXISTS idx_task_templates_category 
  ON task_templates(category);

CREATE INDEX IF NOT EXISTS idx_task_templates_created_by 
  ON task_templates(created_by);

-- RLS Policies for task_templates
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Users can view templates in their workspace
CREATE POLICY "Users can view workspace templates"
  ON task_templates FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can create templates in their workspace
CREATE POLICY "Users can create workspace templates"
  ON task_templates FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON task_templates FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own templates or workspace admins can delete any
CREATE POLICY "Users can delete own templates"
  ON task_templates FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = task_templates.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_task_templates_updated_at();

-- Insert some default templates for demo purposes
-- These will be created when a workspace is first set up
-- (You can run this manually or add to your onboarding flow)

-- Example: Bug Fix Template
-- INSERT INTO task_templates (workspace_id, name, description, category, template_data, created_by)
-- VALUES (
--   'your-workspace-id',
--   'Bug Fix',
--   'Template for bug fix tasks',
--   'Development',
--   '{"title":"Fix: ","description":"## Bug Description\n\n## Steps to Reproduce\n1. \n2. \n3. \n\n## Expected Behavior\n\n## Actual Behavior\n\n## Fix Plan","priority":"high","estimated_hours":2,"category":"Bug","tags":["bug","fix"]}'::jsonb,
--   auth.uid()
-- );

COMMENT ON TABLE task_templates IS 'Reusable task templates with predefined structure';
COMMENT ON COLUMN task_templates.template_data IS 'JSON structure containing task defaults';
