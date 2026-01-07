-- Finance Tracker Database Schema
-- Phase 10: Finance Core

-- Accounts table (bank, cash, credit card, investment, crypto)
CREATE TABLE finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id), -- NULL for shared workspace accounts
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'credit_card', 'investment', 'crypto')),
  currency TEXT DEFAULT 'USD',
  initial_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table (income/expense categories)
CREATE TABLE finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#3b82f6',
  icon TEXT, -- Icon name from lucide-react
  parent_id UUID REFERENCES finance_categories(id), -- For subcategories
  is_system BOOLEAN DEFAULT false, -- Pre-defined categories
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, name, type)
);

-- Transactions table (income, expenses, transfers)
CREATE TABLE finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES finance_categories(id),
  project_id UUID REFERENCES projects(id), -- Link to project for business expenses
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB, -- Same structure as task recurrence
  tags TEXT[], -- Array of tags
  receipt_url TEXT, -- Link to file storage
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets table (category-based budgets)
CREATE TABLE finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category_id UUID REFERENCES finance_categories(id),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold BETWEEN 0 AND 100), -- Alert at 80% spent
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table (savings goals)
CREATE TABLE finance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(15, 2) DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_accounts_workspace ON finance_accounts(workspace_id);
CREATE INDEX idx_accounts_user ON finance_accounts(user_id);
CREATE INDEX idx_categories_workspace ON finance_categories(workspace_id);
CREATE INDEX idx_categories_type ON finance_categories(type);
CREATE INDEX idx_transactions_workspace ON finance_transactions(workspace_id);
CREATE INDEX idx_transactions_account ON finance_transactions(account_id);
CREATE INDEX idx_transactions_category ON finance_transactions(category_id);
CREATE INDEX idx_transactions_date ON finance_transactions(date DESC);
CREATE INDEX idx_transactions_project ON finance_transactions(project_id);
CREATE INDEX idx_transactions_type ON finance_transactions(type);
CREATE INDEX idx_budgets_workspace ON finance_budgets(workspace_id);
CREATE INDEX idx_budgets_category ON finance_budgets(category_id);
CREATE INDEX idx_goals_workspace ON finance_goals(workspace_id);
CREATE INDEX idx_goals_user ON finance_goals(user_id);

-- Trigger to automatically update account balance
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
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

CREATE TRIGGER account_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON finance_transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- RLS Policies
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage accounts" ON finance_accounts
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Workspace members can view categories" ON finance_categories
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR workspace_id IS NULL
  );

CREATE POLICY "Workspace members can manage transactions" ON finance_transactions
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage budgets" ON finance_budgets
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own goals" ON finance_goals
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- Insert system categories (will be available to all workspaces)
INSERT INTO finance_categories (workspace_id, name, type, icon, is_system) VALUES
  -- Expense categories
  (NULL, 'Food & Dining', 'expense', 'utensils', true),
  (NULL, 'Transportation', 'expense', 'car', true),
  (NULL, 'Shopping', 'expense', 'shopping-bag', true),
  (NULL, 'Entertainment', 'expense', 'film', true),
  (NULL, 'Bills & Utilities', 'expense', 'receipt', true),
  (NULL, 'Healthcare', 'expense', 'heart', true),
  (NULL, 'Education', 'expense', 'book', true),
  (NULL, 'Travel', 'expense', 'plane', true),
  (NULL, 'Business', 'expense', 'briefcase', true),
  (NULL, 'Other Expense', 'expense', 'more-horizontal', true),
  -- Income categories
  (NULL, 'Salary', 'income', 'briefcase', true),
  (NULL, 'Freelance', 'income', 'laptop', true),
  (NULL, 'Investment', 'income', 'trending-up', true),
  (NULL, 'Business Income', 'income', 'store', true),
  (NULL, 'Other Income', 'income', 'dollar-sign', true);
