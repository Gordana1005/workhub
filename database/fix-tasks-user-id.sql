-- Hotfix for legacy references to tasks.user_id causing PGRST204
-- Safe to run multiple times (idempotent)

-- 1) Add column if missing
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2) Backfill from assignee_id when available
UPDATE tasks
SET user_id = assignee_id
WHERE user_id IS NULL AND assignee_id IS NOT NULL;

-- 3) Keep user_id in sync with assignee_id going forward
CREATE OR REPLACE FUNCTION sync_task_user_id()
RETURNS trigger AS $$
BEGIN
  NEW.user_id := COALESCE(NEW.assignee_id, NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_task_user_id ON tasks;
CREATE TRIGGER trg_sync_task_user_id
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION sync_task_user_id();

-- 4) Ensure index for filters
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
