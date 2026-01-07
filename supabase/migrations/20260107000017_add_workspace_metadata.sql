-- Add workspace metadata for better organization and visual identification
-- Adds category, color, and description fields to workspaces table

-- Add new columns to workspaces table
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#667eea',
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing workspaces with default color if NULL
UPDATE workspaces 
SET color = '#667eea' 
WHERE color IS NULL;

-- Add index for faster queries on owner_id
CREATE INDEX IF NOT EXISTS idx_workspaces_owner 
  ON workspaces(owner_id);

-- Add index for category filtering (for future features)
CREATE INDEX IF NOT EXISTS idx_workspaces_category 
  ON workspaces(category) 
  WHERE category IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN workspaces.category IS 
  'Workspace category for organization (e.g., Personal, Work, Client, Team, Freelance, Education, Other)';

COMMENT ON COLUMN workspaces.color IS 
  'Hex color code for visual identification in UI (#RRGGBB format). Used for color-coding tasks, projects, and workspace indicators.';

COMMENT ON COLUMN workspaces.description IS 
  'Optional description of the workspace purpose or details';

-- Grant necessary permissions
GRANT SELECT, UPDATE ON workspaces TO authenticated;
