-- ============================================
-- CRITICAL FIX: Remove ALL Recursive Policies
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Drop ALL existing policies on workspace_members
DROP POLICY IF EXISTS "Users can join workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON workspace_members;
DROP POLICY IF EXISTS "Enable read access for all users" ON workspace_members;

-- Step 2: Create SIMPLE policies without ANY subqueries or recursion

-- Allow users to insert themselves as members (NO recursion)
CREATE POLICY "allow_insert_own_membership"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to view ALL workspace members (NO recursion - read all)
-- This is simple but works for now
CREATE POLICY "allow_read_all_members"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update only their own membership
CREATE POLICY "allow_update_own_membership"
ON public.workspace_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Allow users to delete only their own membership
CREATE POLICY "allow_delete_own_membership"
ON public.workspace_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- Fix Workspaces table policies
-- ============================================

-- Drop existing workspace policies
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete workspaces" ON workspaces;

-- Allow authenticated users to create workspaces
CREATE POLICY "allow_create_workspace"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Allow users to view all workspaces (simplest - no recursion)
CREATE POLICY "allow_read_all_workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (true);

-- Allow workspace owners to update their workspaces
CREATE POLICY "allow_update_own_workspace"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- Allow workspace owners to delete their workspaces
CREATE POLICY "allow_delete_own_workspace"
ON public.workspaces
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ============================================
-- Fix Projects table policies
-- ============================================

-- Drop existing project policies
DROP POLICY IF EXISTS "Workspace members can create projects" ON projects;
DROP POLICY IF EXISTS "Workspace members can view projects" ON projects;
DROP POLICY IF EXISTS "Workspace members can update projects" ON projects;
DROP POLICY IF EXISTS "Workspace admins can delete projects" ON projects;

-- Allow authenticated users to create projects
CREATE POLICY "allow_create_project"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to view all projects
CREATE POLICY "allow_read_all_projects"
ON public.projects
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update all projects
CREATE POLICY "allow_update_all_projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to delete all projects
CREATE POLICY "allow_delete_all_projects"
ON public.projects
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Fix Tasks table policies
-- ============================================

-- Drop existing task policies
DROP POLICY IF EXISTS "Workspace members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Workspace members can delete tasks" ON tasks;

-- Allow authenticated users full access to tasks
CREATE POLICY "allow_all_tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to check your policies are correct:

-- Check workspace_members policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'workspace_members';

-- Check workspaces policies  
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'workspaces';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('workspaces', 'workspace_members', 'projects', 'tasks');
