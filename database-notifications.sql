-- Real-time Notifications System
-- Allows users to receive notifications for various events in the workspace

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Notification details
  type VARCHAR(50) NOT NULL, -- 'task_due', 'task_assigned', 'comment_mention', 'task_completed', 'dependency_unblocked'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500), -- Deep link to the relevant resource (e.g., /dashboard/tasks?id=xxx)
  
  -- Related entities (for context)
  related_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  related_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- The user who triggered the notification
  
  -- Notification state
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  CONSTRAINT notifications_type_check CHECK (type IN (
    'task_due', 
    'task_assigned', 
    'comment_mention', 
    'task_completed', 
    'dependency_unblocked',
    'task_overdue',
    'project_update'
  ))
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id 
  ON notifications(workspace_id);

CREATE INDEX IF NOT EXISTS idx_notifications_read 
  ON notifications(read) WHERE read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_notifications_related_task 
  ON notifications(related_task_id) WHERE related_task_id IS NOT NULL;

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, read, created_at DESC) 
  WHERE read = FALSE;

-- RLS Policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- System can create notifications (for triggers/functions)
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- Function to automatically set read_at timestamp
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read = TRUE AND OLD.read = FALSE THEN
    NEW.read_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set read_at
CREATE TRIGGER notifications_set_read_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_notification_read_at();

-- Function to create notification (helper for other triggers)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_workspace_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_link VARCHAR DEFAULT NULL,
  p_related_task_id UUID DEFAULT NULL,
  p_related_project_id UUID DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    workspace_id,
    type,
    title,
    message,
    link,
    related_task_id,
    related_project_id,
    related_user_id
  ) VALUES (
    p_user_id,
    p_workspace_id,
    p_type,
    p_title,
    p_message,
    p_link,
    p_related_task_id,
    p_related_project_id,
    p_related_user_id
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Notify when task is assigned
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if assignee changed and is not null
  IF (TG_OP = 'UPDATE' AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL)
     OR (TG_OP = 'INSERT' AND NEW.assignee_id IS NOT NULL) THEN
    
    -- Don't notify if user assigned task to themselves
    IF NEW.assignee_id != COALESCE(NEW.created_by, auth.uid()) THEN
      PERFORM create_notification(
        NEW.assignee_id,
        NEW.workspace_id,
        'task_assigned',
        'Task Assigned to You',
        'You have been assigned to: ' || NEW.title,
        '/dashboard/tasks?id=' || NEW.id,
        NEW.id,
        NEW.project_id,
        COALESCE(NEW.created_by, auth.uid())
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_assigned_notification
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();

-- Trigger: Notify when task is completed (notify assignee and creator)
CREATE OR REPLACE FUNCTION notify_task_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
    -- Notify task creator if different from completer
    IF NEW.created_by IS NOT NULL AND NEW.created_by != auth.uid() THEN
      PERFORM create_notification(
        NEW.created_by,
        NEW.workspace_id,
        'task_completed',
        'Task Completed',
        'Task "' || NEW.title || '" has been completed',
        '/dashboard/tasks?id=' || NEW.id,
        NEW.id,
        NEW.project_id,
        auth.uid()
      );
    END IF;
    
    -- Check for blocked tasks and notify their assignees
    FOR v_user_id IN 
      SELECT DISTINCT t.assignee_id
      FROM task_dependencies td
      JOIN tasks t ON t.id = td.task_id
      WHERE td.depends_on_task_id = NEW.id
        AND t.assignee_id IS NOT NULL
        AND t.assignee_id != auth.uid()
    LOOP
      PERFORM create_notification(
        v_user_id,
        NEW.workspace_id,
        'dependency_unblocked',
        'Task Dependency Unblocked',
        'A task you depend on has been completed: ' || NEW.title,
        '/dashboard/tasks',
        NULL,
        NEW.project_id,
        auth.uid()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_completed_notification
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_completed();

-- Trigger: Notify on @mentions in comments
CREATE OR REPLACE FUNCTION notify_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_mentioned_users UUID[];
  v_user_id UUID;
  v_task RECORD;
BEGIN
  -- Extract @mentions from comment content (simplified - looks for @username patterns)
  -- In production, you'd want more sophisticated mention parsing
  
  -- Get task details
  SELECT t.*, w.id as workspace_id
  INTO v_task
  FROM tasks t
  JOIN workspaces w ON t.workspace_id = w.id
  WHERE t.id = NEW.task_id;
  
  -- For now, notify all team members when comment is added
  -- (You can enhance this to parse actual @mentions)
  FOR v_user_id IN
    SELECT DISTINCT wm.user_id
    FROM workspace_members wm
    WHERE wm.workspace_id = v_task.workspace_id
      AND wm.user_id != NEW.user_id  -- Don't notify commenter
  LOOP
    IF NEW.content LIKE '%@%' THEN  -- Simple mention detection
      PERFORM create_notification(
        v_user_id,
        v_task.workspace_id,
        'comment_mention',
        'New Comment',
        'New comment on: ' || v_task.title,
        '/dashboard/tasks?id=' || v_task.id,
        v_task.id,
        v_task.project_id,
        NEW.user_id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_mentions_notification
  AFTER INSERT ON task_notes
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_mentions();

-- Function to clean up old read notifications (call periodically)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE read = TRUE
    AND read_at < CURRENT_TIMESTAMP - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old notifications (if using pg_cron)
-- SELECT cron.schedule('cleanup-old-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications(30)');

COMMENT ON TABLE notifications IS 'Real-time notifications for workspace events';
COMMENT ON COLUMN notifications.type IS 'Type of notification event';
COMMENT ON COLUMN notifications.link IS 'Deep link to the relevant resource';
COMMENT ON FUNCTION create_notification IS 'Helper function to create notifications from triggers';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Remove old read notifications to keep table size manageable';
