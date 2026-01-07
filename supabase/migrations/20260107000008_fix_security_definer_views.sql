-- Fix SECURITY DEFINER views by recreating them as SECURITY INVOKER
-- This ensures views use the permissions of the querying user, not the creator

-- Fix webhook_stats view (only if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'webhook_stats') THEN
    DROP VIEW IF EXISTS webhook_stats CASCADE;
    
    -- Recreate the view with the same structure but with security_invoker
    EXECUTE 'CREATE OR REPLACE VIEW webhook_stats WITH (security_invoker = true) AS ' ||
            'SELECT * FROM (' ||
            '  SELECT w.id, w.name, w.workspace_id, w.active, w.success_count, w.failure_count, ' ||
            '    CASE WHEN (w.success_count + w.failure_count) > 0 ' ||
            '      THEN ROUND((w.success_count::DECIMAL / (w.success_count + w.failure_count)) * 100, 2) ' ||
            '      ELSE 0 END as success_rate, ' ||
            '    COUNT(wl.id) as total_deliveries, ' ||
            '    COUNT(wl.id) FILTER (WHERE wl.success = TRUE) as successful_deliveries, ' ||
            '    COUNT(wl.id) FILTER (WHERE wl.success = FALSE) as failed_deliveries, ' ||
            '    AVG(wl.duration_ms) FILTER (WHERE wl.success = TRUE) as avg_response_time_ms, ' ||
            '    MAX(wl.created_at) as last_delivery_at ' ||
            '  FROM webhooks w ' ||
            '  LEFT JOIN webhook_logs wl ON w.id = wl.webhook_id ' ||
            '  GROUP BY w.id' ||
            ') t';
    
    GRANT SELECT ON webhook_stats TO authenticated;
  END IF;
END $$;

-- Fix project_financials view
DROP VIEW IF EXISTS project_financials CASCADE;

CREATE OR REPLACE VIEW project_financials
WITH (security_invoker = true) AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.budget,
  p.budget_currency,
  p.hourly_rate,
  
  -- Expenses and Income from finance_transactions
  COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) AS total_expenses,
  COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0) AS total_income,
  
  -- Budget requests summary
  COALESCE((
    SELECT SUM(amount) 
    FROM project_budget_requests 
    WHERE project_id = p.id AND status = 'pending'
  ), 0) AS pending_requests_amount,
  
  COALESCE((
    SELECT COUNT(*) 
    FROM project_budget_requests 
    WHERE project_id = p.id AND status = 'pending'
  ), 0) AS pending_requests_count,
  
  COALESCE((
    SELECT SUM(amount) 
    FROM project_budget_requests 
    WHERE project_id = p.id AND status = 'approved'
  ), 0) AS approved_requests_amount,
  
  COALESCE((
    SELECT SUM(amount) 
    FROM project_budget_requests 
    WHERE project_id = p.id AND status = 'approved' AND is_paid = true
  ), 0) AS paid_requests_amount,
  
  -- Budget calculations (including approved requests)
  p.budget - COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) - COALESCE((
    SELECT SUM(amount) 
    FROM project_budget_requests 
    WHERE project_id = p.id AND status = 'approved'
  ), 0) AS remaining_budget,
  
  CASE 
    WHEN p.budget > 0 THEN 
      ((COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) + COALESCE((
        SELECT SUM(amount) 
        FROM project_budget_requests 
        WHERE project_id = p.id AND status = 'approved'
      ), 0)) / p.budget * 100)
    ELSE 0 
  END AS budget_used_percentage,
  
  -- Billable hours from time_entries (duration is in seconds)
  COALESCE(SUM(te.duration) / 3600.0, 0) AS total_hours,
  COALESCE((SUM(te.duration) / 3600.0) * COALESCE(p.hourly_rate, 0), 0) AS billable_amount,
  
  -- Profitability
  COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) - 
  COALESCE((
    SELECT SUM(amount) 
    FROM project_budget_requests 
    WHERE project_id = p.id AND status = 'approved'
  ), 0) AS profit,
  
  -- Counts
  COUNT(DISTINCT ft.id) AS transaction_count,
  COUNT(DISTINCT te.id) AS time_entry_count

FROM projects p
LEFT JOIN finance_transactions ft ON ft.project_id = p.id
LEFT JOIN time_entries te ON te.project_id = p.id
GROUP BY p.id, p.name, p.budget, p.budget_currency, p.hourly_rate;

-- Grant access to views
GRANT SELECT ON project_financials TO authenticated;

COMMENT ON VIEW project_financials IS 'Consolidated project financial data including budget, expenses, income, hours, and profitability';
