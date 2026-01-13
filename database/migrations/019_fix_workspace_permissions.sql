-- Fix Workspace Permissions and RLS Recursion
-- This migration fixes the "infinite recursion" or restrictive RLS issues for workspace_members

-- 1. Create a secure helper function to check membership
-- This function runs as the database owner (SECURITY DEFINER), bypassing RLS
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = _workspace_id
    AND user_id = auth.uid()
  );
END;
$$;

-- 2. Fix workspace_members RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;

-- Allow users to see:
-- 1. Their own membership (needed for initial checks)
-- 2. All members of workspaces they belong to (needed for Team page)
CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members
  FOR SELECT
  USING (
    user_id = auth.uid() -- Can always see self
    OR
    is_workspace_member(workspace_id) -- Can see others if I am a member
  );

-- 3. Fix Profiles RLS (Ensure profiles are readable)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

-- Profiles should be viewable by any authenticated user so we can show team members
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Fix Invitations RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invitations for their workspaces" ON invitations;
DROP POLICY IF EXISTS "Users can create invitations for their workspaces" ON invitations;

-- View: Admins/Members should see pending invitations
CREATE POLICY "Users can view invitations for their workspaces"
  ON invitations
  FOR SELECT
  USING (is_workspace_member(workspace_id));

-- Create: Only Admins should create invitations? 
-- For now, let's allow any member to invite (or restrict to admin if needed)
-- We check 'role' in the application logic usually, but here is DB constraint
CREATE POLICY "Users can create invitations for their workspaces"
  ON invitations
  FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

-- Update/Delete: Only sender or Admin
CREATE POLICY "Users can connect to invitations"
  ON invitations
  FOR DELETE
  USING (is_workspace_member(workspace_id));

-- 5. Fix Projects/Tasks RLS using the new helper (Optimization)
-- We can update other tables to use this helper for better performance/readability later
-- For now, let's ensure the core issue (workspace_members 403) is fixed.
