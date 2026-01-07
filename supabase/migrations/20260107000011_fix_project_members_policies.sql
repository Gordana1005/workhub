-- Fix project_members multiple permissive policies for SELECT
-- Combine into single SELECT policy, separate INSERT/UPDATE/DELETE for admins

DROP POLICY IF EXISTS "Can view project members" ON project_members;
DROP POLICY IF EXISTS "Admins can manage project members" ON project_members;

-- Single SELECT policy for all workspace members
CREATE POLICY "Can view project members" ON project_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_members.project_id AND wm.user_id = (select auth.uid())
    )
  );

-- Separate policies for admin management (INSERT, UPDATE, DELETE only)
CREATE POLICY "Admins can insert project members" ON project_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_members.project_id 
        AND wm.user_id = (select auth.uid())
        AND wm.role = 'admin'
    )
  );

CREATE POLICY "Admins can update project members" ON project_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_members.project_id 
        AND wm.user_id = (select auth.uid())
        AND wm.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete project members" ON project_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_members.project_id 
        AND wm.user_id = (select auth.uid())
        AND wm.role = 'admin'
    )
  );
