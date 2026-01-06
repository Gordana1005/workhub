-- Test Data for Recurring Task Generation
-- Run this to create sample recurring tasks for testing

-- 1. Daily Recurring Task: Daily Standup
INSERT INTO tasks (
  title,
  description,
  priority,
  status,
  due_date,
  estimated_hours,
  category,
  workspace_id,
  created_by,
  recurrence_pattern,
  recurrence_end_date
) VALUES (
  'Daily Standup',
  'Team sync meeting every day at 9 AM',
  'high',
  'active',
  CURRENT_DATE + TIME '09:00:00',
  0.25,
  'Meetings',
  (SELECT id FROM workspaces LIMIT 1), -- Replace with actual workspace_id
  (SELECT id FROM auth.users LIMIT 1), -- Replace with actual user_id
  '{"frequency": "daily", "interval": 1}'::jsonb,
  (CURRENT_DATE + INTERVAL '30 days')::timestamp
);

-- 2. Weekly Recurring Task: Monday/Wednesday/Friday Reports
INSERT INTO tasks (
  title,
  description,
  priority,
  status,
  due_date,
  estimated_hours,
  category,
  tags,
  workspace_id,
  created_by,
  recurrence_pattern,
  recurrence_end_date
) VALUES (
  'Submit Progress Report',
  'Weekly progress report due Mon/Wed/Fri by 5 PM',
  'medium',
  'active',
  CURRENT_DATE + TIME '17:00:00',
  1.0,
  'Reporting',
  ARRAY['reports', 'recurring'],
  (SELECT id FROM workspaces LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '{"frequency": "weekly", "daysOfWeek": [1, 3, 5]}'::jsonb,
  (CURRENT_DATE + INTERVAL '90 days')::timestamp
);

-- 3. Weekly Recurring Task: Weekend Review (Saturday)
INSERT INTO tasks (
  title,
  description,
  priority,
  status,
  due_date,
  estimated_hours,
  category,
  workspace_id,
  created_by,
  recurrence_pattern,
  recurrence_end_date
) VALUES (
  'Weekly Review',
  'Review accomplishments and plan next week',
  'medium',
  'active',
  CURRENT_DATE + TIME '10:00:00',
  2.0,
  'Planning',
  (SELECT id FROM workspaces LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '{"frequency": "weekly", "daysOfWeek": [6]}'::jsonb, -- Saturday = 6
  (CURRENT_DATE + INTERVAL '180 days')::timestamp
);

-- 4. Monthly Recurring Task: Monthly Report (15th of each month)
INSERT INTO tasks (
  title,
  description,
  priority,
  status,
  due_date,
  estimated_hours,
  category,
  workspace_id,
  created_by,
  recurrence_pattern,
  recurrence_end_date
) VALUES (
  'Monthly Financial Report',
  'Prepare and submit monthly financial summary',
  'high',
  'active',
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '14 days' + TIME '23:59:59',
  4.0,
  'Finance',
  (SELECT id FROM workspaces LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '{"frequency": "monthly", "dayOfMonth": 15}'::jsonb,
  (CURRENT_DATE + INTERVAL '1 year')::timestamp
);

-- 5. Monthly Recurring Task: First Monday of Month
INSERT INTO tasks (
  title,
  description,
  priority,
  status,
  due_date,
  estimated_hours,
  category,
  workspace_id,
  created_by,
  recurrence_pattern,
  recurrence_end_date
) VALUES (
  'Monthly Team Meeting',
  'All-hands team meeting on first Monday of each month',
  'high',
  'active',
  CURRENT_DATE + TIME '14:00:00', -- 2 PM
  1.0,
  'Meetings',
  (SELECT id FROM workspaces LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '{"frequency": "monthly", "dayOfMonth": 1}'::jsonb, -- Simplified: 1st of month
  NULL -- No end date
);

-- 6. Yearly Recurring Task: Annual Review
INSERT INTO tasks (
  title,
  description,
  priority,
  status,
  due_date,
  estimated_hours,
  category,
  workspace_id,
  created_by,
  recurrence_pattern,
  recurrence_end_date
) VALUES (
  'Annual Performance Review',
  'Complete annual self-assessment and goal setting',
  'urgent',
  'active',
  DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '11 months' + INTERVAL '30 days', -- Dec 31
  8.0,
  'HR',
  (SELECT id FROM workspaces LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '{"frequency": "yearly"}'::jsonb,
  NULL -- Repeats indefinitely
);

-- 7. Daily Recurring with Interval (Every 3 days)
INSERT INTO tasks (
  title,
  description,
  priority,
  status,
  due_date,
  estimated_hours,
  category,
  workspace_id,
  created_by,
  recurrence_pattern,
  recurrence_end_date
) VALUES (
  'Check Server Backups',
  'Verify that automated backups completed successfully',
  'medium',
  'active',
  CURRENT_DATE + TIME '08:00:00',
  0.5,
  'Maintenance',
  (SELECT id FROM workspaces LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '{"frequency": "daily", "interval": 3}'::jsonb, -- Every 3 days
  (CURRENT_DATE + INTERVAL '60 days')::timestamp
);

-- View all recurring task templates
SELECT 
  id,
  title,
  due_date,
  recurrence_pattern,
  recurrence_end_date,
  status,
  created_at
FROM tasks
WHERE recurrence_pattern IS NOT NULL
  AND parent_task_id IS NULL
ORDER BY created_at DESC;

-- View generated instances (after running Edge Function)
SELECT 
  t.id,
  t.title,
  t.due_date,
  t.status,
  t.created_at,
  parent.title as template_title,
  parent.recurrence_pattern
FROM tasks t
INNER JOIN tasks parent ON t.parent_task_id = parent.id
ORDER BY t.created_at DESC
LIMIT 20;

-- Count instances per template
SELECT 
  parent.title as template,
  COUNT(t.id) as instances_generated,
  MAX(t.created_at) as last_generated
FROM tasks t
INNER JOIN tasks parent ON t.parent_task_id = parent.id
GROUP BY parent.id, parent.title
ORDER BY instances_generated DESC;

-- Cleanup test data (optional)
-- DELETE FROM tasks WHERE recurrence_pattern IS NOT NULL;
-- DELETE FROM tasks WHERE parent_task_id IS NOT NULL;
