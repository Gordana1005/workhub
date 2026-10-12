-- 026: Subtasks (one level) + per-task time lookups.
-- Idempotent: safe to run multiple times. The application degrades gracefully until this is applied
-- (subtasks simply stay hidden / disabled, task lists keep loading).
--
-- Model: a subtask is a normal row in `tasks` whose parent_task_id points at a top-level task.
-- It inherits workspace_id / project_id from its parent, supports its own title, assignee, due date
-- and completion, and is removed together with the parent (ON DELETE CASCADE).
--
-- NOTE: the legacy supabase/functions/generate-recurring-tasks edge function (superseded by
-- src/lib/recurrence.ts) also used a `parent_task_id` column to link recurring *instances* to their
-- template. If that function was ever deployed against this database and the column already exists
-- with data, those rows would be treated as subtasks by the app. The notice below tells you if any
-- rows already have a parent_task_id before this migration changes anything.

DO $$
DECLARE
  existing_links bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'parent_task_id'
  ) THEN
    EXECUTE 'SELECT count(*) FROM public.tasks WHERE parent_task_id IS NOT NULL' INTO existing_links;
    RAISE NOTICE 'tasks.parent_task_id already exists with % linked row(s)', existing_links;
  END IF;
END $$;

-- 1. Column + index
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON public.tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- 2. A task can never be its own parent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_parent_not_self_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_parent_not_self_check CHECK (parent_task_id IS NULL OR parent_task_id <> id);
  END IF;
END $$;

-- 3. Keep it one level deep and inside one workspace (the API validates this too; this is the safety net)
CREATE OR REPLACE FUNCTION public.enforce_subtask_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_row record;
BEGIN
  IF NEW.parent_task_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT workspace_id, parent_task_id INTO parent_row FROM public.tasks WHERE id = NEW.parent_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent task does not exist';
  END IF;
  IF parent_row.parent_task_id IS NOT NULL THEN
    RAISE EXCEPTION 'Subtasks cannot be nested (a subtask cannot have subtasks)';
  END IF;
  IF parent_row.workspace_id IS DISTINCT FROM NEW.workspace_id THEN
    RAISE EXCEPTION 'A subtask must belong to the same workspace as its parent';
  END IF;
  -- A task that already has subtasks cannot itself become a subtask
  IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM public.tasks WHERE parent_task_id = NEW.id) THEN
    RAISE EXCEPTION 'A task with subtasks cannot become a subtask';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_subtask_rules ON public.tasks;
CREATE TRIGGER trg_enforce_subtask_rules
  BEFORE INSERT OR UPDATE OF parent_task_id, workspace_id ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_subtask_rules();

-- 4. Per-task time lookups (task detail "Time" section, logged-time totals on task rows)
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id_date
  ON public.time_entries(task_id, date DESC)
  WHERE task_id IS NOT NULL;
