-- Phase 10: Project Budget Requests System
-- Allow team members to request budget and owners to approve/reject

-- Create budget requests table
CREATE TABLE IF NOT EXISTS project_budget_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Request details
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category TEXT, -- What is this expense for? (e.g., "Software Subscription", "Hardware", "Services")
  justification TEXT, -- Why is this needed?
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Payment tracking (once approved)
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  payment_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_budget_requests_project ON project_budget_requests(project_id);
CREATE INDEX idx_budget_requests_requester ON project_budget_requests(requester_id);
CREATE INDEX idx_budget_requests_status ON project_budget_requests(status) WHERE status = 'pending';

-- RLS policies
ALTER TABLE project_budget_requests ENABLE ROW LEVEL SECURITY;

-- Team members can view all requests for their projects
CREATE POLICY "Project members can view budget requests" ON project_budget_requests
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Team members can create requests for their projects
CREATE POLICY "Project members can create budget requests" ON project_budget_requests
  FOR INSERT
  WITH CHECK (
    requester_id = auth.uid() AND
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Only project owners can approve/reject requests
CREATE POLICY "Project owners can update budget requests" ON project_budget_requests
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      WHERE p.created_by = auth.uid()
    )
  );

-- Requesters can update their own pending requests
CREATE POLICY "Requesters can update own pending requests" ON project_budget_requests
  FOR UPDATE
  USING (
    requester_id = auth.uid() AND status = 'pending'
  );

-- Update the project_financials view to include budget requests
DROP VIEW IF EXISTS project_financials;

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

-- Grant access to view
GRANT SELECT ON project_financials TO authenticated;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_budget_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budget_request_updated_at
BEFORE UPDATE ON project_budget_requests
FOR EACH ROW
EXECUTE FUNCTION update_budget_request_timestamp();

-- Comments
COMMENT ON TABLE project_budget_requests IS 'Budget requests from team members requiring owner approval';
COMMENT ON COLUMN project_budget_requests.status IS 'pending: awaiting approval, approved: approved by owner, rejected: denied by owner';
COMMENT ON COLUMN project_budget_requests.is_paid IS 'Whether the approved expense has been paid';
