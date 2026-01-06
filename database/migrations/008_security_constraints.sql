-- Security and Data Integrity Constraints
-- Run this migration to add database-level security

-- Ensure valid priority values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_check'
  ) THEN
    ALTER TABLE tasks 
      ADD CONSTRAINT tasks_priority_check 
      CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
END $$;

-- Ensure workspace_id is never null for core tables
ALTER TABLE tasks ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE projects ALTER COLUMN workspace_id SET NOT NULL;
-- notes table uses project_id, not workspace_id

-- Ensure valid user roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_role_check'
  ) THEN
    ALTER TABLE workspace_members 
      ADD CONSTRAINT workspace_members_role_check 
      CHECK (role IN ('admin', 'member'));
  END IF;
END $$;

-- Ensure valid task status consistency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_status_check
      CHECK (
        (is_completed = true AND completed_at IS NOT NULL) OR
        (is_completed = false)
      );
  END IF;
END $$;

-- Ensure positive time entries duration (if duration column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' AND column_name = 'duration'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'time_entries_duration_check'
    ) THEN
      ALTER TABLE time_entries
        ADD CONSTRAINT time_entries_duration_check
        CHECK (duration > 0);
    END IF;
  END IF;
END $$;

-- Unique invitation per email per workspace
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitations_unique'
  ) THEN
    ALTER TABLE invitations
      ADD CONSTRAINT invitations_unique
      UNIQUE (workspace_id, email);
  END IF;
END $$;

-- Ensure valid webhook events (if webhooks table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'webhooks') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'webhooks_events_check'
    ) THEN
      ALTER TABLE webhooks
        ADD CONSTRAINT webhooks_events_check
        CHECK (events IS NOT NULL AND array_length(events, 1) > 0);
    END IF;
  END IF;
END $$;

-- Ensure valid project status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_status_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_status_check
      CHECK (status IN ('active', 'archived', 'completed', 'on-hold'));
  END IF;
END $$;

-- Prevent self-dependencies in tasks (if task_dependencies table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_dependencies') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'task_dependencies_no_self'
    ) THEN
      ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_no_self
        CHECK (task_id != depends_on_task_id);
    END IF;
  END IF;
END $$;

-- Ensure valid notification types (if notifications table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check'
    ) THEN
      ALTER TABLE notifications
        ADD CONSTRAINT notifications_type_check
        CHECK (type IN ('task_assigned', 'task_completed', 'task_updated', 'mention', 'invite', 'system'));
    END IF;
  END IF;
END $$;

-- Add check for valid email format (basic)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitations_email_format'
  ) THEN
    ALTER TABLE invitations
      ADD CONSTRAINT invitations_email_format
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Ensure template names are not empty (if task_templates table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_templates') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'task_templates_name_check'
    ) THEN
      ALTER TABLE task_templates
        ADD CONSTRAINT task_templates_name_check
        CHECK (length(trim(name)) > 0);
    END IF;
  END IF;
END $$;

-- Add created_at default for tables that might be missing it
ALTER TABLE tasks ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE projects ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE notes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE workspace_members ALTER COLUMN joined_at SET DEFAULT now();

-- Verify constraints were created
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname LIKE '%_check' OR conname LIKE '%_unique'
  AND connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;
