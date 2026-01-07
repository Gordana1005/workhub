-- Fix: Budget request RLS policy to match workspace members instead of project members
-- Issue: INSERT policy requires project_members but users might only be workspace members

-- Drop the restrictive policy that requires project_members
DROP POLICY IF EXISTS "Project members can create budget requests" ON project_budget_requests;

-- Create new policy that allows workspace members to create budget requests
-- This matches the SELECT policy and is more flexible
CREATE POLICY "Workspace members can create budget requests" ON project_budget_requests
  FOR INSERT
  WITH CHECK (
    requester_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_budget_requests.project_id AND wm.user_id = (select auth.uid())
    )
  );

COMMENT ON POLICY "Workspace members can create budget requests" ON project_budget_requests IS 
  'Allows any workspace member to create budget requests for projects in their workspace';
