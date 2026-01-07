-- Fix function search_path warnings by setting explicit search_path
-- This prevents potential schema injection attacks

-- Fix save_note_version function
CREATE OR REPLACE FUNCTION save_note_version()
RETURNS TRIGGER
SET search_path = public
AS $$
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

-- Fix update_milestone_completion function
CREATE OR REPLACE FUNCTION update_milestone_completion()
RETURNS TRIGGER
SET search_path = public
AS $$
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
      is_completed = (completed_tasks = total_tasks AND total_tasks > 0),
      updated_at = NOW()
    WHERE id = milestone_id_var;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fix update_account_balance function
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE finance_accounts
    SET current_balance = current_balance + 
      CASE 
        WHEN NEW.type = 'income' THEN NEW.amount
        WHEN NEW.type = 'expense' THEN -NEW.amount
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = NEW.account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old transaction
    UPDATE finance_accounts
    SET current_balance = current_balance - 
      CASE 
        WHEN OLD.type = 'income' THEN OLD.amount
        WHEN OLD.type = 'expense' THEN -OLD.amount
        ELSE 0
      END
    WHERE id = OLD.account_id;
    
    -- Apply new transaction
    UPDATE finance_accounts
    SET current_balance = current_balance + 
      CASE 
        WHEN NEW.type = 'income' THEN NEW.amount
        WHEN NEW.type = 'expense' THEN -NEW.amount
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = NEW.account_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE finance_accounts
    SET current_balance = current_balance - 
      CASE 
        WHEN OLD.type = 'income' THEN OLD.amount
        WHEN OLD.type = 'expense' THEN -OLD.amount
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = OLD.account_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fix calculate_next_occurrence function
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_current_date DATE,
  p_frequency TEXT,
  p_interval INTEGER,
  p_day_of_month INTEGER DEFAULT NULL,
  p_day_of_week INTEGER DEFAULT NULL
) RETURNS DATE
SET search_path = public
AS $$
DECLARE
  v_next_date DATE;
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      v_next_date := p_current_date + (p_interval || ' days')::INTERVAL;
    WHEN 'weekly' THEN
      v_next_date := p_current_date + (p_interval || ' weeks')::INTERVAL;
      IF p_day_of_week IS NOT NULL THEN
        -- Adjust to specific day of week
        v_next_date := v_next_date + ((p_day_of_week - EXTRACT(DOW FROM v_next_date)::INTEGER) || ' days')::INTERVAL;
      END IF;
    WHEN 'monthly' THEN
      v_next_date := p_current_date + (p_interval || ' months')::INTERVAL;
      IF p_day_of_month IS NOT NULL THEN
        -- Adjust to specific day of month (handle month-end)
        v_next_date := DATE_TRUNC('month', v_next_date) + (LEAST(p_day_of_month, EXTRACT(DAY FROM (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER) - 1 || ' days')::INTERVAL;
      END IF;
    WHEN 'yearly' THEN
      v_next_date := p_current_date + (p_interval || ' years')::INTERVAL;
  END CASE;
  
  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fix set_initial_next_generation_date function
CREATE OR REPLACE FUNCTION set_initial_next_generation_date()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  IF NEW.next_generation_date IS NULL THEN
    NEW.next_generation_date := calculate_next_occurrence(
      COALESCE(NEW.start_date, CURRENT_DATE),
      NEW.frequency,
      NEW.interval,
      NEW.day_of_month,
      NEW.day_of_week
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix update_budget_request_timestamp function
CREATE OR REPLACE FUNCTION update_budget_request_timestamp()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix webhook functions (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks') THEN
    -- Fix generate_webhook_secret function
    EXECUTE 'CREATE OR REPLACE FUNCTION generate_webhook_secret()
    RETURNS TEXT
    SET search_path = public
    AS $func$
    BEGIN
      RETURN encode(gen_random_bytes(32), ''hex'');
    END;
    $func$ LANGUAGE plpgsql;';

    -- Fix trigger_task_webhooks function
    EXECUTE 'CREATE OR REPLACE FUNCTION trigger_task_webhooks()
    RETURNS TRIGGER
    SET search_path = public
    AS $func$
    BEGIN
      -- This is called from edge function/external service
      -- Just return the row for now
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;';

    -- Fix cleanup_old_webhook_logs function
    EXECUTE 'CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
    RETURNS void
    SET search_path = public
    AS $func$
    BEGIN
      DELETE FROM webhook_logs
      WHERE created_at < NOW() - INTERVAL ''30 days'';
    END;
    $func$ LANGUAGE plpgsql;';
  END IF;
END $$;
