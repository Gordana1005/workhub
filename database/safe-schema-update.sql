-- Safe Database Schema Update
-- This script only creates tables/types that don't already exist

-- Enable UUID extension (safe)
create extension if not exists "uuid-ossp";

-- Check and create missing tables
DO $$
BEGIN
    -- Create workspace_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_role') THEN
        CREATE TYPE workspace_role AS ENUM ('admin', 'member');
    END IF;

    -- Create priority_level enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
        CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;

    -- Add username column to profiles if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username'
    ) THEN
        ALTER TABLE profiles ADD COLUMN username text;
        UPDATE profiles
        SET username = lower(regexp_replace(coalesce(username, full_name, email, 'user'), '[^a-zA-Z0-9]+', '-', 'g'))
               || '-' || substr(md5(random()::text), 1, 6)
        WHERE username IS NULL;
        ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;
    END IF;

    -- Create invitations table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
        CREATE TABLE invitations (
            id uuid default uuid_generate_v4() primary key,
            workspace_id uuid references workspaces(id) on delete cascade not null,
            email text not null,
            token text unique not null,
            role workspace_role default 'member',
            created_at timestamp with time zone default timezone('utc'::text, now()),
            expires_at timestamp with time zone default (now() + interval '7 days')
        );
    END IF;

    -- Create subtasks table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subtasks') THEN
        CREATE TABLE subtasks (
            id uuid default uuid_generate_v4() primary key,
            task_id uuid references tasks(id) on delete cascade not null,
            title text not null,
            is_completed boolean default false,
            created_at timestamp with time zone default timezone('utc'::text, now())
        );
    END IF;

    -- Create time_entries table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
        CREATE TABLE time_entries (
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
    END IF;

    -- Create notes table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
        CREATE TABLE notes (
            id uuid default uuid_generate_v4() primary key,
            project_id uuid references projects(id) on delete cascade not null,
            author_id uuid references profiles(id),
            title text not null,
            content text,
            created_at timestamp with time zone default timezone('utc'::text, now())
        );
    END IF;
END $$;

-- Enable RLS on all tables (safe to run multiple times)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
CREATE POLICY "Users can view workspaces they belong to" ON workspaces FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
CREATE POLICY "Users can view workspace members" ON workspace_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON projects;
CREATE POLICY "Users can view projects in their workspaces" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
CREATE POLICY "Users can view tasks in their workspaces" ON tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspace_members wm JOIN projects p ON p.workspace_id = wm.workspace_id WHERE p.id = tasks.project_id AND wm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
CREATE POLICY "Users can view own time entries" ON time_entries FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view notes in their workspaces" ON notes;
CREATE POLICY "Users can view notes in their workspaces" ON notes FOR SELECT USING (
  EXISTS (SELECT 1 FROM workspace_members wm JOIN projects p ON p.workspace_id = wm.workspace_id WHERE p.id = notes.project_id AND wm.user_id = auth.uid())
);