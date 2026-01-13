-- Fix Infinite Recursion in RLS Policies

-- We will use a SECURITY DEFINER function to break the recursion loop between
-- workspaces and workspace_members policies.
-- SECURITY DEFINER functions run with the privileges of the creator (postgres/admin)
-- and bypass RLS on the tables they access.

-- 1. Create helper function to get user's workspaces
CREATE OR REPLACE FUNCTION get_user_workspace_ids(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = user_uuid;
$$;

-- 2. Drop existing problematic policies

-- Workspaces
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;

-- Workspace Members
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON workspace_members;

-- 3. Re-create Policies using the Safe Function

-- Workspaces Policies
-- View: Owners OR Members (via safe function)
CREATE POLICY "Users can view workspaces they belong to" ON workspaces
FOR SELECT USING (
    owner_id = auth.uid() 
    OR 
    id IN (SELECT get_user_workspace_ids(auth.uid()))
);

-- Insert: Users can create workspaces (setting themselves as owner)
CREATE POLICY "Users can create workspaces" ON workspaces
FOR INSERT WITH CHECK (
    owner_id = auth.uid()
);

-- Update/Delete: Only Owners
CREATE POLICY "Owners can update workspaces" ON workspaces
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete workspaces" ON workspaces
FOR DELETE USING (owner_id = auth.uid());


-- Workspace Members Policies
-- View: If I am the user OR I am a member of the workspace OR I own the workspace
-- We need to check if auth.uid() is a member of the workspace_id in the row being accessed.
-- OR if auth.uid() owns the workspace_id.

-- To avoid recursion here (since we are on workspace_members), we need to be careful about checking 'workspaces' table 
-- if 'workspaces' table checks 'workspace_members'.
-- But 'workspaces' policy now uses `get_user_workspace_ids` which bypasses RLS on workspace_members.
-- So checking 'workspaces' from 'workspace_members' is now SAFE.

CREATE POLICY "Users can view workspace members" ON workspace_members
FOR SELECT USING (
    -- I am the member
    user_id = auth.uid() 
    OR
    -- I am a member of this workspace (recurses to workspace_members via function? No, function is safe)
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR
    -- I own the workspace (checks workspaces table, which is safe now)
    exists (
        SELECT 1 FROM workspaces 
        WHERE id = workspace_members.workspace_id 
        AND owner_id = auth.uid()
    )
);

-- Insert: Self-registration (if allowed) or Owners adding members
CREATE POLICY "Manage workspace members" ON workspace_members
FOR INSERT WITH CHECK (
    -- Users can add themselves (join)
    user_id = auth.uid()
    OR
    -- Owners can insert
    exists (
        SELECT 1 FROM workspaces 
        WHERE id = workspace_members.workspace_id 
        AND owner_id = auth.uid()
    )
);

-- Update/Delete: Owners
CREATE POLICY "Owners can manage members" ON workspace_members
FOR ALL USING (
    exists (
        SELECT 1 FROM workspaces 
        WHERE id = workspace_members.workspace_id 
        AND owner_id = auth.uid()
    )
);

-- Also fix TASKS and PROJECTS to use the safe logic just in case

DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their workspaces" ON tasks;

CREATE POLICY "Users can view tasks in their workspaces" ON tasks
FOR SELECT USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR
    EXISTS (SELECT 1 FROM workspaces WHERE id = tasks.workspace_id AND owner_id = auth.uid())
);

CREATE POLICY "Users can create tasks in their workspaces" ON tasks
FOR INSERT WITH CHECK (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR
    EXISTS (SELECT 1 FROM workspaces WHERE id = tasks.workspace_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update tasks in their workspaces" ON tasks;
CREATE POLICY "Users can update tasks in their workspaces" ON tasks
FOR UPDATE USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR
    EXISTS (SELECT 1 FROM workspaces WHERE id = tasks.workspace_id AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete tasks in their workspaces" ON tasks;
CREATE POLICY "Users can delete tasks in their workspaces" ON tasks
FOR DELETE USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
    OR
    EXISTS (SELECT 1 FROM workspaces WHERE id = tasks.workspace_id AND owner_id = auth.uid())
);

-- Fix Plans RLS as well (assuming plans table exists or will exist)
-- Check if table exists first to avoid error
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') THEN
        DROP POLICY IF EXISTS "Users can view plans" ON plans;
        DROP POLICY IF EXISTS "Users can create plans" ON plans;
        
        CREATE POLICY "Users can view plans" ON plans
        FOR SELECT USING (
             workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
             OR
             EXISTS (SELECT 1 FROM workspaces WHERE id = plans.workspace_id AND owner_id = auth.uid())
        );
        
        CREATE POLICY "Users can create plans" ON plans
        FOR INSERT WITH CHECK (
             workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
             OR
             EXISTS (SELECT 1 FROM workspaces WHERE id = plans.workspace_id AND owner_id = auth.uid())
        );
                 
        CREATE POLICY "Users can update plans" ON plans
        FOR UPDATE USING (
             workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
             OR
             EXISTS (SELECT 1 FROM workspaces WHERE id = plans.workspace_id AND owner_id = auth.uid())
        );
    END IF;
END $$;
