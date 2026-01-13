-- Migration to add support for Task Board features (status) and enhanced details
-- Adds columns: status, category, estimated_hours, tags, recurrence_pattern

DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'status') THEN
        ALTER TABLE tasks ADD COLUMN status text DEFAULT 'To Do';
    END IF;

    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'category') THEN
        ALTER TABLE tasks ADD COLUMN category text;
    END IF;

    -- Add estimated_hours column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'estimated_hours') THEN
        ALTER TABLE tasks ADD COLUMN estimated_hours numeric;
    END IF;

    -- Add tags column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'tags') THEN
        ALTER TABLE tasks ADD COLUMN tags text[];
    END IF;

    -- Add recurrence_pattern column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'recurrence_pattern') THEN
        ALTER TABLE tasks ADD COLUMN recurrence_pattern jsonb;
    END IF;

    -- Update existing tasks to have a status based on is_completed
    UPDATE tasks SET status = CASE 
        WHEN is_completed = true THEN 'Done'
        ELSE 'To Do'
    END
    WHERE status IS NULL OR status = 'active' OR status = 'completed'; -- clean up potential legacy values

END $$;
