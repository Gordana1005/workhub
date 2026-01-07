-- Optimize RLS policies to prevent auth.uid() re-evaluation for each row
-- Replace auth.uid() with (select auth.uid()) in all policies

-- Notes Advanced Migration Policies
DROP POLICY IF EXISTS "Workspace members can manage links" ON note_links;
CREATE POLICY "Workspace members can manage links" ON note_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      INNER JOIN projects p ON p.id = n.project_id
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE n.id = note_links.source_note_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can view tags" ON tags;
CREATE POLICY "Workspace members can view tags" ON tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = tags.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can create tags" ON tags;
CREATE POLICY "Workspace members can create tags" ON tags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = tags.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can manage note tags" ON note_tags;
CREATE POLICY "Workspace members can manage note tags" ON note_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      INNER JOIN projects p ON p.id = n.project_id
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE n.id = note_tags.note_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can view templates" ON note_templates;
CREATE POLICY "Workspace members can view templates" ON note_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = note_templates.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can create templates" ON note_templates;
CREATE POLICY "Workspace members can create templates" ON note_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = note_templates.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Template creators can update own templates" ON note_templates;
CREATE POLICY "Template creators can update own templates" ON note_templates
  FOR UPDATE
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Note owners can view versions" ON note_versions;
CREATE POLICY "Note owners can view versions" ON note_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes n
      INNER JOIN projects p ON p.id = n.project_id
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE n.id = note_versions.note_id AND wm.user_id = (select auth.uid())
    )
  );

-- Plans Migration Policies
DROP POLICY IF EXISTS "Workspace members can manage plans" ON plans;
CREATE POLICY "Workspace members can manage plans" ON plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = plans.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can manage milestones" ON plan_milestones;
CREATE POLICY "Workspace members can manage milestones" ON plan_milestones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM plans p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = plan_milestones.plan_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can link tasks" ON milestone_tasks;
CREATE POLICY "Workspace members can link tasks" ON milestone_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM plan_milestones pm
      INNER JOIN plans p ON p.id = pm.plan_id
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE pm.id = milestone_tasks.milestone_id AND wm.user_id = (select auth.uid())
    )
  );

-- Finance Migration Policies
DROP POLICY IF EXISTS "Workspace members can manage accounts" ON finance_accounts;
CREATE POLICY "Workspace members can manage accounts" ON finance_accounts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = finance_accounts.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can view categories" ON finance_categories;
CREATE POLICY "Workspace members can view categories" ON finance_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = finance_categories.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can manage transactions" ON finance_transactions;
CREATE POLICY "Workspace members can manage transactions" ON finance_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = finance_transactions.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can manage budgets" ON finance_budgets;
CREATE POLICY "Workspace members can manage budgets" ON finance_budgets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = finance_budgets.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own goals" ON finance_goals;
CREATE POLICY "Users can manage own goals" ON finance_goals
  FOR ALL
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = finance_goals.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

-- Finance Goals & Forecasting Policies
DROP POLICY IF EXISTS "Workspace members can manage recurring templates" ON finance_recurring_templates;
CREATE POLICY "Workspace members can manage recurring templates" ON finance_recurring_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = finance_recurring_templates.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own scenarios" ON finance_scenarios;
CREATE POLICY "Users can manage own scenarios" ON finance_scenarios
  FOR ALL
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = finance_scenarios.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

-- Project Budget Requests Policies - Combine multiple permissive policies
DROP POLICY IF EXISTS "Project members can view budget requests" ON project_budget_requests;
CREATE POLICY "Project members can view budget requests" ON project_budget_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_budget_requests.project_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Project members can create budget requests" ON project_budget_requests;
CREATE POLICY "Project members can create budget requests" ON project_budget_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = project_budget_requests.project_id AND pm.user_id = (select auth.uid())
    )
  );

-- Combine the two UPDATE policies for project_budget_requests
DROP POLICY IF EXISTS "Project owners can update budget requests" ON project_budget_requests;
DROP POLICY IF EXISTS "Requesters can update own pending requests" ON project_budget_requests;
CREATE POLICY "Can update budget requests" ON project_budget_requests
  FOR UPDATE
  USING (
    -- Project creators can update any request
    project_id IN (
      SELECT p.id 
      FROM projects p
      WHERE p.creator_id = (select auth.uid())
    )
    OR
    -- Requesters can update their own pending requests
    (requester_id = (select auth.uid()) AND status = 'pending')
  );

-- Core schema policies (from database-schema.sql patterns)
-- These likely already exist but need optimization

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT 
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE 
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
CREATE POLICY "Users can view workspaces they belong to" ON workspaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = workspaces.id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "allow_insert_own_membership" ON workspace_members;
CREATE POLICY "allow_insert_own_membership" ON workspace_members
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "allow_update_own_membership" ON workspace_members;
CREATE POLICY "allow_update_own_membership" ON workspace_members
  FOR UPDATE
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "allow_delete_own_membership" ON workspace_members;
CREATE POLICY "allow_delete_own_membership" ON workspace_members
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- Combine project_members SELECT policies
DROP POLICY IF EXISTS "Users can view project members in their workspaces" ON project_members;
DROP POLICY IF EXISTS "Admins can manage project members" ON project_members;
CREATE POLICY "Can view project members" ON project_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_members.project_id AND wm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can manage project members" ON project_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_members.project_id 
        AND wm.user_id = (select auth.uid())
        AND wm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON projects;
CREATE POLICY "Users can view projects in their workspaces" ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = projects.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create projects in their workspaces" ON projects;
CREATE POLICY "Users can create projects in their workspaces" ON projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = projects.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
CREATE POLICY "Users can view tasks in their workspaces" ON tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create tasks in their workspaces" ON tasks;
CREATE POLICY "Users can create tasks in their workspaces" ON tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update tasks in their workspaces" ON tasks;
CREATE POLICY "Users can update tasks in their workspaces" ON tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete tasks in their workspaces" ON tasks;
CREATE POLICY "Users can delete tasks in their workspaces" ON tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

-- Combine time_entries INSERT policies
DROP POLICY IF EXISTS "Users can view time entries in their workspaces" ON time_entries;
CREATE POLICY "Users can view time entries in their workspaces" ON time_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = time_entries.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create time entries in their workspaces" ON time_entries;
DROP POLICY IF EXISTS "Users can create own time entries" ON time_entries;
CREATE POLICY "Users can create time entries" ON time_entries
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = time_entries.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view notes in their workspaces" ON notes;
CREATE POLICY "Users can view notes in their workspaces" ON notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = notes.project_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view categories in their workspaces" ON task_categories;
CREATE POLICY "Users can view categories in their workspaces" ON task_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = task_categories.workspace_id AND wm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert categories" ON task_categories;
CREATE POLICY "Admins can insert categories" ON task_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = task_categories.workspace_id 
        AND wm.user_id = (select auth.uid())
        AND wm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update categories" ON task_categories;
CREATE POLICY "Admins can update categories" ON task_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = task_categories.workspace_id 
        AND wm.user_id = (select auth.uid())
        AND wm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete categories" ON task_categories;
CREATE POLICY "Admins can delete categories" ON task_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = task_categories.workspace_id 
        AND wm.user_id = (select auth.uid())
        AND wm.role = 'admin'
    )
  );

-- Webhook policies (if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view webhooks in their workspace" ON webhooks';
    EXECUTE 'CREATE POLICY "Users can view webhooks in their workspace" ON webhooks
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM workspace_members wm 
          WHERE wm.workspace_id = webhooks.workspace_id AND wm.user_id = (select auth.uid())
        )
      )';

    EXECUTE 'DROP POLICY IF EXISTS "Admins can create webhooks" ON webhooks';
    EXECUTE 'CREATE POLICY "Admins can create webhooks" ON webhooks
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM workspace_members wm 
          WHERE wm.workspace_id = webhooks.workspace_id 
            AND wm.user_id = (select auth.uid())
            AND wm.role = ''admin''
        )
      )';

    EXECUTE 'DROP POLICY IF EXISTS "Admins can update webhooks" ON webhooks';
    EXECUTE 'CREATE POLICY "Admins can update webhooks" ON webhooks
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM workspace_members wm 
          WHERE wm.workspace_id = webhooks.workspace_id 
            AND wm.user_id = (select auth.uid())
            AND wm.role = ''admin''
        )
      )';

    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete webhooks" ON webhooks';
    EXECUTE 'CREATE POLICY "Admins can delete webhooks" ON webhooks
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM workspace_members wm 
          WHERE wm.workspace_id = webhooks.workspace_id 
            AND wm.user_id = (select auth.uid())
            AND wm.role = ''admin''
        )
      )';

    EXECUTE 'DROP POLICY IF EXISTS "Users can view webhook logs in their workspace" ON webhook_logs';
    EXECUTE 'CREATE POLICY "Users can view webhook logs in their workspace" ON webhook_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM webhooks w
          INNER JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
          WHERE w.id = webhook_logs.webhook_id AND wm.user_id = (select auth.uid())
        )
      )';
  END IF;
END $$;
