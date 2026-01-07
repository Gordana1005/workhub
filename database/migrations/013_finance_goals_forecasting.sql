-- Phase 10.3: Financial Goals & Forecasting
-- Add forecasting capabilities and recurring transaction support

-- Add missing columns to finance_goals if not present
ALTER TABLE finance_goals
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS milestone_amount DECIMAL(15, 2), -- Intermediate milestone
  ADD COLUMN IF NOT EXISTS milestone_date DATE;

-- Create index for active goals
CREATE INDEX IF NOT EXISTS idx_goals_status ON finance_goals(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON finance_goals(target_date) WHERE target_date IS NOT NULL;

-- Add recurring transaction support to transactions table
CREATE TABLE IF NOT EXISTS finance_recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES finance_categories(id),
  project_id UUID REFERENCES projects(id),
  
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  
  -- Recurrence pattern
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INTEGER DEFAULT 1 CHECK (interval > 0), -- Every X days/weeks/months/years
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- NULL for indefinite
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31), -- For monthly
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- For weekly (0=Sunday)
  
  is_active BOOLEAN DEFAULT true,
  last_generated_date DATE,
  next_generation_date DATE,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_next_date ON finance_recurring_templates(next_generation_date) 
  WHERE is_active = true AND next_generation_date IS NOT NULL;

CREATE INDEX idx_recurring_workspace ON finance_recurring_templates(workspace_id);

-- RLS for recurring templates
ALTER TABLE finance_recurring_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage recurring templates" ON finance_recurring_templates
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Function to calculate next occurrence date
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_current_date DATE,
  p_frequency TEXT,
  p_interval INTEGER,
  p_day_of_month INTEGER DEFAULT NULL,
  p_day_of_week INTEGER DEFAULT NULL
) RETURNS DATE AS $$
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

-- Trigger to set initial next_generation_date on insert
CREATE OR REPLACE FUNCTION set_initial_next_generation_date()
RETURNS TRIGGER AS $$
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

CREATE TRIGGER set_next_date_on_insert
BEFORE INSERT ON finance_recurring_templates
FOR EACH ROW
EXECUTE FUNCTION set_initial_next_generation_date();

-- Create table for forecast scenarios
CREATE TABLE IF NOT EXISTS finance_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Scenario assumptions
  assumptions JSONB DEFAULT '{}'::JSONB,
  -- e.g., { "monthly_income": 5000, "monthly_expenses": 3000, "growth_rate": 0.05 }
  
  -- Results (calculated)
  projected_balance JSONB, -- Array of future balances
  months_to_goal INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scenarios" ON finance_scenarios
  USING (user_id = auth.uid());

-- Helpful comments
COMMENT ON TABLE finance_recurring_templates IS 'Templates for recurring transactions (subscriptions, salaries, bills)';
COMMENT ON TABLE finance_scenarios IS 'What-if financial scenarios and forecasts';
COMMENT ON FUNCTION calculate_next_occurrence IS 'Calculate next occurrence date for recurring transactions';
