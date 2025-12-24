-- Create test accounts and data
-- Run this in Supabase SQL Editor

-- IMPORTANT: You must create a workspace first!
-- 1. Login to the app (admin@admin.com / admin)
-- 2. Create a workspace through the UI
-- 3. Then come back and run this script

-- Check if workspace exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM workspaces LIMIT 1) THEN
    RAISE EXCEPTION 'No workspace found! Please create a workspace in the app first.';
  END IF;
END $$;

-- Create test projects (use your actual workspace_id)
INSERT INTO projects (workspace_id, name, description, color, status)
VALUES
  ((SELECT id FROM workspaces LIMIT 1), 'Website Redesign', 'Complete overhaul of company website with modern UI/UX', '#667eea', 'active'),
  ((SELECT id FROM workspaces LIMIT 1), 'Mobile App Development', 'iOS and Android app for productivity tracking', '#f093fb', 'active'),
  ((SELECT id FROM workspaces LIMIT 1), 'Marketing Campaign', 'Q1 2025 marketing initiatives and social media strategy', '#4facfe', 'active'),
  ((SELECT id FROM workspaces LIMIT 1), 'API Integration', 'Integrate third-party APIs for data synchronization', '#43e97b', 'active'),
  ((SELECT id FROM workspaces LIMIT 1), 'Database Migration', 'Migrate legacy database to new system', '#fa709a', 'active');

-- Create test tasks for each project
INSERT INTO tasks (
  workspace_id, 
  project_id, 
  title, 
  description, 
  status, 
  priority, 
  assignee_id, 
  due_date, 
  is_completed
)
SELECT 
  p.workspace_id,
  p.id,
  'Task ' || gs.n || ' for ' || p.name,
  'This is a sample task description for project ' || p.name,
  CASE (random() * 3)::int 
    WHEN 0 THEN 'todo'
    WHEN 1 THEN 'in-progress'
    WHEN 2 THEN 'review'
    ELSE 'done'
  END,
  CASE (random() * 3)::int 
    WHEN 0 THEN 'low'
    WHEN 1 THEN 'medium'
    WHEN 2 THEN 'high'
    ELSE 'urgent'
  END,
  (SELECT id FROM auth.users LIMIT 1),
  CURRENT_DATE + (random() * 60)::int,
  random() < 0.3
FROM 
  projects p
CROSS JOIN 
  generate_series(1, 10) gs(n)
WHERE 
  p.workspace_id = (SELECT id FROM workspaces LIMIT 1);

-- Create time entries
INSERT INTO time_entries (
  workspace_id,
  project_id,
  task_id,
  user_id,
  start_time,
  end_time,
  duration,
  description
)
SELECT 
  t.workspace_id,
  t.project_id,
  t.id,
  t.assignee_id,
  CURRENT_TIMESTAMP - (random() * interval '30 days'),
  CURRENT_TIMESTAMP - (random() * interval '30 days') + (random() * interval '4 hours'),
  (random() * 4 * 3600)::int,
  'Working on ' || t.title
FROM 
  tasks t
WHERE 
  t.workspace_id = (SELECT id FROM workspaces LIMIT 1)
  AND random() < 0.5
LIMIT 50;

-- Verify data
SELECT 'Projects created:' as info, COUNT(*) as count FROM projects;
SELECT 'Tasks created:' as info, COUNT(*) as count FROM tasks;
SELECT 'Time entries created:' as info, COUNT(*) as count FROM time_entries;
