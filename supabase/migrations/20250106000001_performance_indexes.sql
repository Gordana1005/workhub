-- Performance Optimization Indexes
-- Run this migration to improve query performance

-- Index for workspace-based queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
-- notes table uses project_id, not workspace_id
CREATE INDEX IF NOT EXISTS idx_time_entries_workspace_id ON time_entries(workspace_id);

-- Index for project-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_priority ON tasks(workspace_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_due ON tasks(workspace_id, due_date) WHERE due_date IS NOT NULL;

-- Index for date-range queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);

-- Index for dependencies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_dependencies') THEN
    CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(depends_on_task_id);
  END IF;
END $$;

-- Index for recurring tasks (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recurring_tasks') THEN
    CREATE INDEX IF NOT EXISTS idx_recurring_tasks_workspace ON recurring_tasks(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_tasks_next_occurrence ON recurring_tasks(next_occurrence) WHERE is_active = true;
  END IF;
END $$;

-- Index for templates (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_templates') THEN
    CREATE INDEX IF NOT EXISTS idx_task_templates_workspace ON task_templates(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_task_templates_creator ON task_templates(creator_id);
  END IF;
END $$;

-- Index for webhooks (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'webhooks') THEN
    CREATE INDEX IF NOT EXISTS idx_webhooks_workspace ON webhooks(workspace_id);
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'webhook_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at);
  END IF;
END $$;

-- Index for notifications (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
  END IF;
END $$;

-- Full-text search indexes (PostgreSQL GIN indexes)
-- These enable fast text search across titles and descriptions
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING GIN(
  to_tsvector('english', title || ' ' || COALESCE(description, ''))
);

CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING GIN(
  to_tsvector('english', title || ' ' || COALESCE(content, ''))
);

CREATE INDEX IF NOT EXISTS idx_projects_search ON projects USING GIN(
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Update table statistics for better query planning
ANALYZE tasks;
ANALYZE projects;
ANALYZE notes;
ANALYZE time_entries;
ANALYZE workspace_members;

-- ANALYZE optional tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_dependencies') THEN
    EXECUTE 'ANALYZE task_dependencies';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recurring_tasks') THEN
    EXECUTE 'ANALYZE recurring_tasks';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_templates') THEN
    EXECUTE 'ANALYZE task_templates';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'webhooks') THEN
    EXECUTE 'ANALYZE webhooks';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'webhook_logs') THEN
    EXECUTE 'ANALYZE webhook_logs';
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'ANALYZE notifications';
  END IF;
END $$;

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
