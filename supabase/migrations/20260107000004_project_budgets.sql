-- Phase 10.2: Project Budget Tracking
-- Add budget tracking to projects

-- Add budget columns to projects table
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS budget DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS budget_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2);

-- Create view for project financial overview
CREATE OR REPLACE VIEW project_financials AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.budget,
  p.budget_currency,
  p.hourly_rate,
  
  -- Expenses and Income from finance_transactions
  COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) AS total_expenses,
  COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0) AS total_income,
  
  -- Budget calculations
  p.budget - COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) AS remaining_budget,
  CASE 
    WHEN p.budget > 0 THEN 
      (COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) / p.budget * 100)
    ELSE 0 
  END AS budget_used_percentage,
  
  -- Billable hours from time_entries (duration is in seconds)
  COALESCE(SUM(te.duration) / 3600.0, 0) AS total_hours,
  COALESCE((SUM(te.duration) / 3600.0) * COALESCE(p.hourly_rate, 0), 0) AS billable_amount,
  
  -- Profitability
  COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) AS profit,
  
  -- Counts
  COUNT(DISTINCT ft.id) AS transaction_count,
  COUNT(DISTINCT te.id) AS time_entry_count

FROM projects p
LEFT JOIN finance_transactions ft ON ft.project_id = p.id
LEFT JOIN time_entries te ON te.project_id = p.id
GROUP BY p.id, p.name, p.budget, p.budget_currency, p.hourly_rate;

-- Grant access to view
GRANT SELECT ON project_financials TO authenticated;

-- Add helpful comment
COMMENT ON VIEW project_financials IS 'Consolidated project financial data including budget, expenses, income, hours, and profitability';
