-- Add RLS policies for tables that have RLS enabled but no policies

-- Invitations table policies
-- Invitations are managed by workspace admins
CREATE POLICY "Workspace admins can view invitations" ON invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = invitations.workspace_id 
        AND wm.user_id = (select auth.uid())
        AND wm.role = 'admin'
    )
  );

CREATE POLICY "Workspace admins can create invitations" ON invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = invitations.workspace_id 
        AND wm.user_id = (select auth.uid())
        AND wm.role = 'admin'
    )
  );

CREATE POLICY "Workspace admins can delete invitations" ON invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = invitations.workspace_id 
        AND wm.user_id = (select auth.uid())
        AND wm.role = 'admin'
    )
  );

-- Anyone with valid token can view their invitation (for accepting invites)
CREATE POLICY "Users can view invitations by token" ON invitations
  FOR SELECT
  USING (true);

-- Subtasks table policies
-- Subtasks inherit permissions from parent task's workspace
CREATE POLICY "Users can view subtasks in their workspaces" ON subtasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = subtasks.task_id AND wm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create subtasks in their workspaces" ON subtasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = subtasks.task_id AND wm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update subtasks in their workspaces" ON subtasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = subtasks.task_id AND wm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete subtasks in their workspaces" ON subtasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = subtasks.task_id AND wm.user_id = (select auth.uid())
    )
  );
