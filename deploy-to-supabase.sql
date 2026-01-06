-- =====================================================
-- WORKHUB DATABASE SCHEMA - SUPABASE DEPLOYMENT
-- Copy and paste this entire file into Supabase SQL Editor
-- =====================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "http";

-- =====================================================
-- WEBHOOKS SYSTEM
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP FUNCTION IF EXISTS trigger_task_webhooks() CASCADE;
DROP FUNCTION IF EXISTS generate_webhook_secret() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_webhook_logs() CASCADE;
DROP VIEW IF EXISTS webhook_stats CASCADE;

-- Create webhooks table
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  verify_ssl BOOLEAN DEFAULT TRUE,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_url CHECK (url ~* '^https?://'),
  CONSTRAINT valid_events CHECK (array_length(events, 1) > 0)
);

-- Create webhook_logs table
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  attempt_number INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_webhooks_workspace ON webhooks(workspace_id);
CREATE INDEX idx_webhooks_active ON webhooks(active) WHERE active = TRUE;
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);
CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_success ON webhook_logs(success);

-- Enable RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhooks
CREATE POLICY "Users can view webhooks in their workspace"
  ON webhooks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create webhooks"
  ON webhooks FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update webhooks"
  ON webhooks FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete webhooks"
  ON webhooks FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for webhook_logs
CREATE POLICY "Users can view webhook logs in their workspace"
  ON webhook_logs FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM webhooks 
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Function: Generate webhook secret
CREATE OR REPLACE FUNCTION generate_webhook_secret()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function: Trigger task webhooks
CREATE OR REPLACE FUNCTION trigger_task_webhooks()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  event_type TEXT;
  task_data JSONB;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    event_type := 'task.created';
    task_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      event_type := 'task.completed';
    ELSE
      event_type := 'task.updated';
    END IF;
    task_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    event_type := 'task.deleted';
    task_data := to_jsonb(OLD);
  END IF;

  -- Find active webhooks for this workspace and event
  FOR webhook_record IN
    SELECT id, url, secret 
    FROM webhooks
    WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
      AND active = TRUE
      AND event_type = ANY(events)
  LOOP
    -- Call the Edge Function to deliver webhook asynchronously
    PERFORM http_post(
      'https://miqwspnfqdqrwkdqviif.supabase.co/functions/v1/deliver-webhook',
      jsonb_build_object(
        'webhook_id', webhook_record.id,
        'event_type', event_type,
        'payload', task_data
      )::text,
      'application/json'::text
    );
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER task_webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_webhooks();

-- Function: Cleanup old webhook logs
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create webhook stats view
CREATE OR REPLACE VIEW webhook_stats AS
SELECT 
  w.id,
  w.name,
  w.workspace_id,
  w.success_count,
  w.failure_count,
  CASE 
    WHEN (w.success_count + w.failure_count) > 0 
    THEN ROUND((w.success_count::DECIMAL / (w.success_count + w.failure_count)) * 100, 2)
    ELSE 0
  END as success_rate,
  AVG(wl.duration_ms) as avg_response_time,
  COUNT(wl.id) as total_logs,
  MAX(wl.created_at) as last_log_at
FROM webhooks w
LEFT JOIN webhook_logs wl ON w.id = wl.webhook_id
GROUP BY w.id, w.name, w.workspace_id, w.success_count, w.failure_count;

-- Add task category column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'category'
  ) THEN
    ALTER TABLE tasks ADD COLUMN category TEXT;
    CREATE INDEX idx_tasks_category ON tasks(category);
  END IF;
END $$;

-- Verification: Check what was created
SELECT 'Deployment completed! Tables created:' as message;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('webhooks', 'webhook_logs')
ORDER BY table_name;
