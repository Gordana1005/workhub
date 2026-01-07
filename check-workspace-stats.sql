-- Check workspaces
SELECT 
  id,
  name,
  category,
  color,
  description,
  owner_id,
  created_at
FROM workspaces
ORDER BY created_at DESC;

-- Check workspace members count per workspace
SELECT 
  w.id,
  w.name,
  COUNT(wm.user_id) as member_count
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
GROUP BY w.id, w.name;

-- Check projects count per workspace
SELECT 
  w.id,
  w.name,
  COUNT(p.id) as project_count
FROM workspaces w
LEFT JOIN projects p ON w.id = p.workspace_id
GROUP BY w.id, w.name;

-- Check for projects without workspace_id
SELECT 
  id,
  name,
  workspace_id,
  created_at
FROM projects
WHERE workspace_id IS NULL
ORDER BY created_at DESC;

-- Count total projects and tasks
SELECT 
  (SELECT COUNT(*) FROM projects) as total_projects,
  (SELECT COUNT(*) FROM tasks) as total_tasks,
  (SELECT COUNT(*) FROM workspaces) as total_workspaces,
  (SELECT COUNT(*) FROM workspace_members) as total_members;
