-- Migration 010: Plans Feature
-- Strategic planning, roadmaps, OKRs, milestones
-- Created: 2026-01-07

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT, -- Strategic goal (e.g., "Launch v2.0", "Hit $100k ARR")
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  owner_id UUID REFERENCES profiles(id),
  color TEXT DEFAULT '#3b82f6', -- For visual distinction
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_workspace ON plans(workspace_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_dates ON plans(start_date, end_date);

-- Milestones table
CREATE TABLE IF NOT EXISTS plan_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0, -- For custom ordering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_plan ON plan_milestones(plan_id);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON plan_milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_milestones_order ON plan_milestones(plan_id, order_index);

-- Junction: Link tasks to plan milestones
CREATE TABLE IF NOT EXISTS milestone_tasks (
  milestone_id UUID NOT NULL REFERENCES plan_milestones(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (milestone_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_milestone_tasks_milestone ON milestone_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_task ON milestone_tasks(task_id);

-- Auto-calculate milestone completion from tasks
CREATE OR REPLACE FUNCTION update_milestone_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  milestone_id_var UUID;
BEGIN
  -- Get milestone from old or new task
  SELECT mt.milestone_id INTO milestone_id_var
  FROM milestone_tasks mt
  WHERE mt.task_id = COALESCE(NEW.id, OLD.id)
  LIMIT 1;

  IF milestone_id_var IS NOT NULL THEN
    -- Count tasks
    SELECT COUNT(*), COUNT(*) FILTER (WHERE t.is_completed)
    INTO total_tasks, completed_tasks
    FROM milestone_tasks mt
    INNER JOIN tasks t ON t.id = mt.task_id
    WHERE mt.milestone_id = milestone_id_var;

    -- Update milestone
    UPDATE plan_milestones
    SET 
      completion_percentage = CASE 
        WHEN total_tasks = 0 THEN 0
        ELSE (completed_tasks * 100 / total_tasks)
      END,
      is_completed = (completed_tasks = total_tasks AND total_tasks > 0),
      completed_at = CASE
        WHEN (completed_tasks = total_tasks AND total_tasks > 0) THEN NOW()
        ELSE NULL
      END
    WHERE id = milestone_id_var;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS milestone_completion_trigger ON tasks;

CREATE TRIGGER milestone_completion_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_milestone_completion();

-- RLS Policies
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Workspace members can manage plans" ON plans;
DROP POLICY IF EXISTS "Workspace members can manage milestones" ON plan_milestones;
DROP POLICY IF EXISTS "Workspace members can link tasks" ON milestone_tasks;

CREATE POLICY "Workspace members can manage plans" ON plans
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage milestones" ON plan_milestones
  USING (
    plan_id IN (
      SELECT p.id FROM plans p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can link tasks" ON milestone_tasks
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      INNER JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Insert default plan template (optional)
INSERT INTO plans (workspace_id, name, description, goal, start_date, end_date, status, color)
SELECT 
  w.id,
  'Q1 2026 Roadmap',
  'First quarter strategic goals and milestones',
  'Launch core features and reach first customers',
  '2026-01-01',
  '2026-03-31',
  'draft',
  '#3b82f6'
FROM workspaces w
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE workspace_id = w.id)
LIMIT 1;
