-- ProductivityHub Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  job_title text,
  department text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. WORKSPACES
create table if not exists workspaces (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  owner_id uuid references profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. WORKSPACE_MEMBERS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_role') THEN
        CREATE TYPE workspace_role AS ENUM ('admin', 'member');
    END IF;
END $$;

create table if not exists workspace_members (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role workspace_role default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  unique(workspace_id, user_id)
);

-- 4. INVITATIONS
create table if not exists invitations (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  email text not null,
  token text unique not null,
  role workspace_role default 'member',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  expires_at timestamp with time zone default (now() + interval '7 days')
);

-- 5. PROJECTS
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  creator_id uuid references profiles(id),
  name text not null,
  description text,
  category text,
  color text default '#667eea',
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. TASKS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
        CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
END $$;

create table if not exists tasks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  creator_id uuid references profiles(id),
  assignee_id uuid references profiles(id),
  title text not null,
  description text,
  priority priority_level default 'medium',
  due_date timestamp with time zone,
  is_completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. SUBTASKS
create table if not exists subtasks (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references tasks(id) on delete cascade not null,
  title text not null,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. TIME_ENTRIES
create table if not exists time_entries (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  user_id uuid references profiles(id) not null,
  duration int not null, -- in seconds
  description text,
  date date default CURRENT_DATE,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 9. NOTES
create table if not exists notes (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  author_id uuid references profiles(id),
  title text not null,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security on all tables
alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table invitations enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table subtasks enable row level security;
alter table time_entries enable row level security;
alter table notes enable row level security;

-- Create basic RLS policies (users can only access data in workspaces they belong to)
-- These are essential for multi-tenancy security

-- Profiles: Users can only see their own profile
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Workspaces: Users can only see workspaces they are members of
drop policy if exists "Users can view workspaces they belong to" on workspaces;
create policy "Users can view workspaces they belong to" on workspaces for select using (
  owner_id = auth.uid() or exists (select 1 from workspace_members where workspace_id = workspaces.id and user_id = auth.uid())
);
drop policy if exists "Users can create workspaces" on workspaces;
create policy "Users can create workspaces" on workspaces for insert with check (owner_id = auth.uid());

-- Workspace Members: Users can view members of workspaces they own or their own membership
drop policy if exists "Users can view workspace members" on workspace_members;
create policy "Users can view workspace members" on workspace_members for select using (
  user_id = auth.uid() or exists (select 1 from workspaces where id = workspace_members.workspace_id and owner_id = auth.uid())
);
drop policy if exists "Users can join workspaces" on workspace_members;
create policy "Users can join workspaces" on workspace_members for insert with check (user_id = auth.uid());
drop policy if exists "Workspace owners can add members" on workspace_members;
create policy "Workspace owners can add members" on workspace_members for insert with check (exists (select 1 from workspaces where id = workspace_members.workspace_id and owner_id = auth.uid()));

-- Projects: Users can only see projects in workspaces they belong to
drop policy if exists "Users can view projects in their workspaces" on projects;
create policy "Users can view projects in their workspaces" on projects for select using (
  exists (select 1 from workspace_members where workspace_id = projects.workspace_id and user_id = auth.uid())
);
drop policy if exists "Users can create projects in their workspaces" on projects;
create policy "Users can create projects in their workspaces" on projects for insert with check (
  exists (select 1 from workspace_members where workspace_id = projects.workspace_id and user_id = auth.uid())
);

-- Tasks: Users can only see tasks in projects from workspaces they belong to
drop policy if exists "Users can view tasks in their workspaces" on tasks;
create policy "Users can view tasks in their workspaces" on tasks for select using (
  exists (select 1 from workspace_members wm join projects p on p.workspace_id = wm.workspace_id where p.id = tasks.project_id and wm.user_id = auth.uid())
);
drop policy if exists "Users can create tasks in their workspaces" on tasks;
create policy "Users can create tasks in their workspaces" on tasks for insert with check (
  exists (select 1 from workspace_members wm join projects p on p.workspace_id = wm.workspace_id where p.id = tasks.project_id and wm.user_id = auth.uid())
);

-- Time Entries: Users can only see their own time entries
drop policy if exists "Users can view own time entries" on time_entries;
create policy "Users can view own time entries" on time_entries for select using (auth.uid() = user_id);
drop policy if exists "Users can create own time entries" on time_entries;
create policy "Users can create own time entries" on time_entries for insert with check (auth.uid() = user_id and exists (select 1 from workspace_members where workspace_id = time_entries.workspace_id and user_id = auth.uid()));

-- Notes: Users can only see notes in projects from workspaces they belong to
drop policy if exists "Users can view notes in their workspaces" on notes;
create policy "Users can view notes in their workspaces" on notes for select using (
  exists (select 1 from workspace_members wm join projects p on p.workspace_id = wm.workspace_id where p.id = notes.project_id and wm.user_id = auth.uid())
);