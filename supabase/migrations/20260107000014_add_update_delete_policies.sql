-- Add missing UPDATE and DELETE policies for projects and notes tables
-- This fixes the issue where users cannot edit projects or notes

-- ============================================
-- PROJECTS - Add UPDATE and DELETE policies
-- ============================================

-- Workspace members can update projects in their workspaces
DROP POLICY IF EXISTS "Users can update projects in their workspaces" ON projects;
CREATE POLICY "Users can update projects in their workspaces" ON projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = projects.workspace_id 
        AND wm.user_id = (select auth.uid())
    )
  );

-- Workspace members can delete projects in their workspaces
DROP POLICY IF EXISTS "Users can delete projects in their workspaces" ON projects;
CREATE POLICY "Users can delete projects in their workspaces" ON projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = projects.workspace_id 
        AND wm.user_id = (select auth.uid())
    )
  );

-- ============================================
-- NOTES - Add INSERT, UPDATE, and DELETE policies
-- ============================================

-- Workspace members can create notes in their workspaces
DROP POLICY IF EXISTS "Users can create notes in their workspaces" ON notes;
CREATE POLICY "Users can create notes in their workspaces" ON notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = notes.project_id AND wm.user_id = (select auth.uid())
    )
  );

-- Workspace members can update notes in their workspaces
DROP POLICY IF EXISTS "Users can update notes in their workspaces" ON notes;
CREATE POLICY "Users can update notes in their workspaces" ON notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = notes.project_id AND wm.user_id = (select auth.uid())
    )
  );

-- Workspace members can delete notes in their workspaces
DROP POLICY IF EXISTS "Users can delete notes in their workspaces" ON notes;
CREATE POLICY "Users can delete notes in their workspaces" ON notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = notes.project_id AND wm.user_id = (select auth.uid())
    )
  );

-- ============================================
-- TIME_ENTRIES - Add UPDATE and DELETE policies
-- ============================================

-- Users can update their own time entries
DROP POLICY IF EXISTS "Users can update own time entries" ON time_entries;
CREATE POLICY "Users can update own time entries" ON time_entries
  FOR UPDATE
  USING (user_id = (select auth.uid()));

-- Users can delete their own time entries
DROP POLICY IF EXISTS "Users can delete own time entries" ON time_entries;
CREATE POLICY "Users can delete own time entries" ON time_entries
  FOR DELETE
  USING (user_id = (select auth.uid()));
