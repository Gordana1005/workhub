-- Fix: note_versions INSERT policy + notifications table
-- This migration fixes two issues:
-- 1. note_versions table only has SELECT policy, preventing trigger from inserting versions
-- 2. notifications table doesn't exist

-- ============================================
-- 1. FIX NOTE_VERSIONS RLS POLICIES
-- ============================================

-- Add INSERT policy for note_versions - allows the trigger to insert version history
-- The trigger runs with the user's permissions, so we need a policy that allows
-- workspace members to insert versions when they update notes
DROP POLICY IF EXISTS "Allow version inserts on note update" ON note_versions;
CREATE POLICY "Allow version inserts on note update" ON note_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes n
      INNER JOIN projects p ON p.id = n.project_id
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE n.id = note_versions.note_id AND wm.user_id = (select auth.uid())
    )
  );

-- ============================================
-- 2. CREATE NOTIFICATIONS TABLE
-- ============================================

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Notification details
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  
  -- Related entities (for context)
  related_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  related_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Notification state
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id 
  ON notifications(workspace_id) WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_read 
  ON notifications(read) WHERE read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, read, created_at DESC) 
  WHERE read = FALSE;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = (select auth.uid()));

-- Function to automatically set read_at timestamp
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.read = TRUE AND OLD.read = FALSE THEN
    NEW.read_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set read_at
DROP TRIGGER IF EXISTS notifications_set_read_at ON notifications;
CREATE TRIGGER notifications_set_read_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_notification_read_at();

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

-- Add type constraint if not exists (using DO block to check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_type_check CHECK (type IN (
        'task_due', 
        'task_assigned', 
        'comment_mention', 
        'task_completed', 
        'dependency_unblocked',
        'task_overdue',
        'project_update',
        'budget_request',
        'budget_approved',
        'budget_rejected',
        'team_invite',
        'general'
      ));
  END IF;
EXCEPTION WHEN others THEN
  -- Constraint may already exist with different definition, ignore
  NULL;
END;
$$;

-- Comments
COMMENT ON TABLE notifications IS 'User notifications for various workspace events';
COMMENT ON COLUMN notifications.type IS 'Type of notification (task_due, task_assigned, etc.)';
COMMENT ON COLUMN notifications.read IS 'Whether the notification has been read';
