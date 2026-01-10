import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const schema = `
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  email text,
  username text not null unique,
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
create type if not exists workspace_role as enum ('admin', 'member');

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
create type if not exists priority_level as enum ('low', 'medium', 'high', 'urgent');

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
-- Profiles: Users can only see their own profile
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Workspaces: Users can only see workspaces they are members of
drop policy if exists "Users can view workspaces they belong to" on workspaces;
create policy "Users can view workspaces they belong to" on workspaces for select using (
  exists (select 1 from workspace_members where workspace_id = workspaces.id and user_id = auth.uid())
);

-- Workspace Members: Users can view members of workspaces they belong to
drop policy if exists "Users can view workspace members" on workspace_members;
create policy "Users can view workspace members" on workspace_members for select using (
  exists (select 1 from workspace_members wm where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid())
);

-- Projects: Users can only see projects in workspaces they belong to
drop policy if exists "Users can view projects in their workspaces" on projects;
create policy "Users can view projects in their workspaces" on projects for select using (
  exists (select 1 from workspace_members where workspace_id = projects.workspace_id and user_id = auth.uid())
);

-- Tasks: Users can only see tasks in projects from workspaces they belong to
drop policy if exists "Users can view tasks in their workspaces" on tasks;
create policy "Users can view tasks in their workspaces" on tasks for select using (
  exists (select 1 from workspace_members wm join projects p on p.workspace_id = wm.workspace_id where p.id = tasks.project_id and wm.user_id = auth.uid())
);

-- Time Entries: Users can only see their own time entries
drop policy if exists "Users can view own time entries" on time_entries;
create policy "Users can view own time entries" on time_entries for select using (auth.uid() = user_id);

-- Notes: Users can only see notes in projects from workspaces they belong to
drop policy if exists "Users can view notes in their workspaces" on notes;
create policy "Users can view notes in their workspaces" on notes for select using (
  exists (select 1 from workspace_members wm join projects p on p.workspace_id = wm.workspace_id where p.id = notes.project_id and wm.user_id = auth.uid())
);
`

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Split the schema into individual statements and execute them
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0)

    const results = []
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' })
          if (error) {
            // If rpc doesn't work, try direct execution (this might not work for DDL)
            results.push({ statement: statement.trim(), status: 'skipped', reason: 'DDL statements need manual execution' })
          } else {
            results.push({ statement: statement.trim(), status: 'executed' })
          }
        } catch (err) {
          results.push({ statement: statement.trim(), status: 'error', error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }
    }

    return NextResponse.json({
      message: 'Schema execution attempted',
      results,
      recommendation: 'For DDL statements (CREATE TABLE, ALTER TABLE, etc.), please run the schema manually in Supabase SQL Editor'
    })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}