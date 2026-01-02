-- Add missing RLS policies for notes table
-- Run this in Supabase SQL Editor to fix notes visibility

-- Drop existing policies
drop policy if exists "Users can view notes in their workspaces" on notes;
drop policy if exists "Users can create notes in their workspaces" on notes;
drop policy if exists "Users can update notes in their workspaces" on notes;
drop policy if exists "Users can delete notes in their workspaces" on notes;

-- Allow users to view notes from projects in workspaces they belong to
create policy "Users can view notes in their workspaces" on notes for select using (
  exists (
    select 1 from workspace_members wm 
    join projects p on p.workspace_id = wm.workspace_id 
    where p.id = notes.project_id and wm.user_id = auth.uid()
  )
);

-- Allow users to create notes in projects from workspaces they belong to
create policy "Users can create notes in their workspaces" on notes for insert with check (
  exists (
    select 1 from workspace_members wm 
    join projects p on p.workspace_id = wm.workspace_id 
    where p.id = notes.project_id and wm.user_id = auth.uid()
  )
);

-- Allow users to update their own notes or notes in workspaces they admin
create policy "Users can update notes in their workspaces" on notes for update using (
  author_id = auth.uid() or 
  exists (
    select 1 from workspace_members wm 
    join projects p on p.workspace_id = wm.workspace_id 
    where p.id = notes.project_id and wm.user_id = auth.uid()
  )
);

-- Allow users to delete their own notes or notes in workspaces they admin
create policy "Users can delete notes in their workspaces" on notes for delete using (
  author_id = auth.uid() or 
  exists (
    select 1 from workspace_members wm 
    join projects p on p.workspace_id = wm.workspace_id 
    where p.id = notes.project_id and wm.user_id = auth.uid() and wm.role = 'admin'
  )
);
