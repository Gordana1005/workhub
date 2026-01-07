-- URGENT FIX: Remove recursive policies that are breaking everything
-- The previous migration created policies with circular references

-- Drop ALL policies on workspace_members first
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can add workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can delete workspace members" ON workspace_members;

-- Drop ALL policies on workspaces
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Admins can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON workspaces;

-- ============================================
-- WORKSPACES POLICIES (Simple, no recursion)
-- ============================================

-- INSERT: Anyone can create a workspace if they set themselves as owner
CREATE POLICY "workspaces_insert"
ON workspaces FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

-- SELECT: Owner can always see their workspaces
-- (We'll handle member access through a direct join in the API)
CREATE POLICY "workspaces_select"
ON workspaces FOR SELECT TO authenticated
USING (owner_id = auth.uid());

-- UPDATE: Owner can update
CREATE POLICY "workspaces_update"
ON workspaces FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE: Owner can delete
CREATE POLICY "workspaces_delete"
ON workspaces FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- ============================================
-- WORKSPACE_MEMBERS POLICIES (Simple, no recursion)
-- ============================================

-- INSERT: Workspace owner can add members
CREATE POLICY "workspace_members_insert"
ON workspace_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_id 
    AND owner_id = auth.uid()
  )
);

-- SELECT: Users can see memberships for workspaces they own
-- OR their own membership records
CREATE POLICY "workspace_members_select"
ON workspace_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_id 
    AND owner_id = auth.uid()
  )
);

-- UPDATE: Only workspace owner can update members
CREATE POLICY "workspace_members_update"
ON workspace_members FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_id 
    AND owner_id = auth.uid()
  )
);

-- DELETE: Workspace owner can remove, or user can remove themselves
CREATE POLICY "workspace_members_delete"
ON workspace_members FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_id 
    AND owner_id = auth.uid()
  )
);
