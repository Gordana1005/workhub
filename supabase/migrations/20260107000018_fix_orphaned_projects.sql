-- Fix orphaned projects by assigning them to their creator's first workspace
-- This migration will:
-- 1. Find projects without workspace_id
-- 2. Assign them to the creator's first workspace (where they are a member)

DO $$
DECLARE
    project_record RECORD;
    user_workspace_id UUID;
BEGIN
    -- Loop through projects without workspace_id
    FOR project_record IN 
        SELECT id, creator_id 
        FROM projects 
        WHERE workspace_id IS NULL
    LOOP
        -- Find the first workspace where the creator is a member
        SELECT wm.workspace_id INTO user_workspace_id
        FROM workspace_members wm
        WHERE wm.user_id = project_record.creator_id
        LIMIT 1;

        -- If found, update the project
        IF user_workspace_id IS NOT NULL THEN
            UPDATE projects
            SET workspace_id = user_workspace_id
            WHERE id = project_record.id;
            
            RAISE NOTICE 'Assigned project % to workspace %', project_record.id, user_workspace_id;
        ELSE
            RAISE WARNING 'No workspace found for user % (project %)', project_record.creator_id, project_record.id;
        END IF;
    END LOOP;
END $$;

-- Add index for better performance on workspace queries
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id) WHERE workspace_id IS NOT NULL;

-- Update workspace names if they are just numbers (like "22")
-- This will give them a proper default name
UPDATE workspaces
SET name = 'My Workspace'
WHERE name ~ '^\d+$'  -- matches if name is only digits
  AND category IS NULL; -- only update if no category set

-- Set default category for workspaces without one
UPDATE workspaces
SET category = 'personal'
WHERE category IS NULL OR category = '';

-- Set default color for workspaces without one
UPDATE workspaces
SET color = '#667eea'
WHERE color IS NULL OR color = '';
