-- Fix RLS policies for workspaces table
-- The table has RLS enabled but is missing INSERT/UPDATE policies

-- First, let's see what policies exist and drop them to recreate properly
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Admins can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON workspaces;
DROP POLICY IF EXISTS "workspace_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspace_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspace_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspace_delete_policy" ON workspaces;

-- Enable RLS if not already enabled
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Policy 1: Any authenticated user can INSERT a new workspace
-- They will become the owner automatically
CREATE POLICY "Users can create workspaces"
ON workspaces
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Policy 2: Users can SELECT workspaces they are members of
CREATE POLICY "Users can view their workspaces"
ON workspaces
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
  )
  OR owner_id = auth.uid()
);

-- Policy 3: Workspace admins can UPDATE the workspace
CREATE POLICY "Admins can update workspaces"
ON workspaces
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = 'admin'
  )
  OR owner_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = 'admin'
  )
  OR owner_id = auth.uid()
);

-- Policy 4: Only owner can DELETE the workspace
CREATE POLICY "Owners can delete workspaces"
ON workspaces
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Also fix workspace_members policies to allow the creator to add themselves
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can manage workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;

-- Enable RLS on workspace_members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view members of workspaces they belong to
CREATE POLICY "Users can view workspace members"
ON workspace_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- Policy: Workspace owner can add members (including themselves on creation)
CREATE POLICY "Owners can add workspace members"
ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = workspace_members.workspace_id
    AND workspaces.owner_id = auth.uid()
  )
  OR user_id = auth.uid() -- Users can add themselves
);

-- Policy: Admins can update members
CREATE POLICY "Admins can update workspace members"
ON workspace_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
);

-- Policy: Admins can remove members, users can remove themselves
CREATE POLICY "Admins can delete workspace members"
ON workspace_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
  OR user_id = auth.uid() -- Users can leave workspaces
);
