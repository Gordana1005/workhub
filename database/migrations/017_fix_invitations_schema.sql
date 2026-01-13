-- Fix invitations table schema
-- Adding missing columns that are expected by the API

ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Add index for performance on lookups
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_workspace_id ON invitations(workspace_id);
