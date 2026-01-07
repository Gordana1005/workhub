-- Phase 8.2: Advanced Note Features Migration
-- Adds support for nested notes, links, tags, templates, and version history

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add parent_id for nested notes (hierarchy)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES notes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notes_parent ON notes(parent_id);

-- Add workspace_id to notes for better querying (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE notes ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    
    -- Populate workspace_id from project_id
    UPDATE notes SET workspace_id = (
      SELECT workspace_id FROM projects WHERE projects.id = notes.project_id
    );
    
    -- Make it NOT NULL after populating
    ALTER TABLE notes ALTER COLUMN workspace_id SET NOT NULL;
    CREATE INDEX idx_notes_workspace ON notes(workspace_id);
  END IF;
END $$;

-- Bi-directional links table (notes <-> notes, notes <-> tasks)
CREATE TABLE IF NOT EXISTS note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  target_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  link_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Either target_note_id OR target_task_id must be set
  CONSTRAINT note_links_target_check CHECK (
    (target_note_id IS NOT NULL AND target_task_id IS NULL) OR
    (target_note_id IS NULL AND target_task_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(source_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target_note ON note_links(target_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target_task ON note_links(target_task_id);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6', -- Hex color
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_workspace ON tags(workspace_id);

-- Note-Tag junction table
CREATE TABLE IF NOT EXISTS note_tags (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);

-- Templates table
CREATE TABLE IF NOT EXISTS note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- HTML content from Tiptap
  category TEXT DEFAULT 'general', -- meeting, project, brainstorm, documentation, etc.
  icon TEXT DEFAULT '📝',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_templates_workspace ON note_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON note_templates(category);

-- Version history table
CREATE TABLE IF NOT EXISTS note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_versions_note ON note_versions(note_id, version_number DESC);

-- Function to automatically save note versions on update
CREATE OR REPLACE FUNCTION save_note_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only save version if content or title actually changed
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO note_versions (note_id, content, title, version_number, created_by)
    VALUES (
      NEW.id,
      OLD.content,
      OLD.title,
      COALESCE((SELECT MAX(version_number) FROM note_versions WHERE note_id = NEW.id), 0) + 1,
      NEW.author_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic version saving
DROP TRIGGER IF EXISTS note_version_trigger ON notes;
CREATE TRIGGER note_version_trigger
AFTER UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION save_note_version();

-- Enable Row Level Security
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_links
DROP POLICY IF EXISTS "Workspace members can manage links" ON note_links;
CREATE POLICY "Workspace members can manage links" ON note_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      INNER JOIN projects p ON p.id = n.project_id
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE n.id = note_links.source_note_id AND wm.user_id = auth.uid()
    )
  );

-- RLS Policies for tags
DROP POLICY IF EXISTS "Workspace members can view tags" ON tags;
CREATE POLICY "Workspace members can view tags" ON tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = tags.workspace_id AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can create tags" ON tags;
CREATE POLICY "Workspace members can create tags" ON tags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = tags.workspace_id AND wm.user_id = auth.uid()
    )
  );

-- RLS Policies for note_tags
DROP POLICY IF EXISTS "Workspace members can manage note tags" ON note_tags;
CREATE POLICY "Workspace members can manage note tags" ON note_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      INNER JOIN projects p ON p.id = n.project_id
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE n.id = note_tags.note_id AND wm.user_id = auth.uid()
    )
  );

-- RLS Policies for note_templates
DROP POLICY IF EXISTS "Workspace members can view templates" ON note_templates;
CREATE POLICY "Workspace members can view templates" ON note_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = note_templates.workspace_id AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can create templates" ON note_templates;
CREATE POLICY "Workspace members can create templates" ON note_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = note_templates.workspace_id AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Template creators can update own templates" ON note_templates;
CREATE POLICY "Template creators can update own templates" ON note_templates
  FOR UPDATE
  USING (created_by = auth.uid());

-- RLS Policies for note_versions
DROP POLICY IF EXISTS "Note owners can view versions" ON note_versions;
CREATE POLICY "Note owners can view versions" ON note_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      INNER JOIN projects p ON p.id = n.project_id
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE n.id = note_versions.note_id AND wm.user_id = auth.uid()
    )
  );

-- Create some default templates
INSERT INTO note_templates (workspace_id, name, description, content, category, icon, created_by)
SELECT 
  w.id,
  'Meeting Notes',
  'Template for meeting notes with agenda and action items',
  '<h2>📅 Meeting Details</h2><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><p><strong>Duration:</strong> </p><h2>📋 Agenda</h2><ul><li><p></p></li></ul><h2>💡 Discussion Points</h2><p></p><h2>✅ Action Items</h2><ul data-type="taskList"><li data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul><h2>📝 Next Steps</h2><p></p>',
  'meeting',
  '📅',
  w.owner_id
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM note_templates nt 
  WHERE nt.workspace_id = w.id AND nt.name = 'Meeting Notes'
);

INSERT INTO note_templates (workspace_id, name, description, content, category, icon, created_by)
SELECT 
  w.id,
  'Project Documentation',
  'Template for project documentation',
  '<h1>Project Name</h1><h2>📖 Overview</h2><p></p><h2>🎯 Goals</h2><ul><li><p></p></li></ul><h2>🚀 Features</h2><ul><li><p></p></li></ul><h2>📐 Architecture</h2><p></p><h2>🔧 Technical Details</h2><pre><code>// Code examples</code></pre><h2>📝 Notes</h2><p></p>',
  'documentation',
  '📖',
  w.owner_id
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM note_templates nt 
  WHERE nt.workspace_id = w.id AND nt.name = 'Project Documentation'
);

-- Verify tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('note_links', 'tags', 'note_tags', 'note_templates', 'note_versions')
ORDER BY table_name;
