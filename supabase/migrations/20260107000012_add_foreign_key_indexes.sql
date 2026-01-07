-- Add missing indexes for foreign key columns
-- These indexes improve JOIN performance, DELETE cascades, and foreign key constraint checks

-- Finance tables
CREATE INDEX IF NOT EXISTS idx_finance_categories_parent_id 
  ON finance_categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_finance_recurring_templates_account_id 
  ON finance_recurring_templates(account_id);

CREATE INDEX IF NOT EXISTS idx_finance_recurring_templates_category_id 
  ON finance_recurring_templates(category_id);

CREATE INDEX IF NOT EXISTS idx_finance_recurring_templates_created_by 
  ON finance_recurring_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_finance_recurring_templates_project_id 
  ON finance_recurring_templates(project_id);

CREATE INDEX IF NOT EXISTS idx_finance_scenarios_user_id 
  ON finance_scenarios(user_id);

CREATE INDEX IF NOT EXISTS idx_finance_scenarios_workspace_id 
  ON finance_scenarios(workspace_id);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_created_by 
  ON finance_transactions(created_by);

-- Notes tables
CREATE INDEX IF NOT EXISTS idx_note_templates_created_by 
  ON note_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_note_versions_created_by 
  ON note_versions(created_by);

CREATE INDEX IF NOT EXISTS idx_notes_author_id 
  ON notes(author_id);

-- Plans
CREATE INDEX IF NOT EXISTS idx_plans_owner_id 
  ON plans(owner_id);

-- Projects and related
CREATE INDEX IF NOT EXISTS idx_project_budget_requests_approved_by 
  ON project_budget_requests(approved_by);

CREATE INDEX IF NOT EXISTS idx_projects_creator_id 
  ON projects(creator_id);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id 
  ON subtasks(task_id);

-- Time entries
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id 
  ON time_entries(project_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_id 
  ON time_entries(user_id);

-- Webhooks (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks') THEN
    CREATE INDEX IF NOT EXISTS idx_webhooks_created_by ON webhooks(created_by);
  END IF;
END $$;

-- Workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id 
  ON workspaces(owner_id);
