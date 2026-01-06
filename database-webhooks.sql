-- Webhooks System Database Schema
-- Enables external integrations via HTTP callbacks

-- Extension for UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Webhooks table: stores webhook configurations
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- For HMAC signature verification
  description TEXT,
  
  -- Event types this webhook subscribes to
  events TEXT[] NOT NULL DEFAULT '{}',
  -- Available events: task.created, task.updated, task.completed, task.deleted,
  --                   project.created, project.updated, project.deleted,
  --                   comment.created, time_entry.created
  
  -- Configuration
  active BOOLEAN DEFAULT TRUE,
  verify_ssl BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  
  -- Stats
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT valid_url CHECK (url ~* '^https?://'),
  CONSTRAINT valid_events CHECK (array_length(events, 1) > 0)
);

-- Webhook delivery logs: tracks all webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  
  -- Request details
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  
  -- Response details
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  
  -- Delivery info
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_ms INTEGER, -- Request duration in milliseconds
  
  -- Retry info
  attempt_number INTEGER DEFAULT 1,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  success BOOLEAN DEFAULT FALSE,
  
  -- Indexes for common queries
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhooks_workspace ON webhooks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_success ON webhook_logs(success);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry ON webhook_logs(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- RLS Policies for webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Users can view webhooks in their workspaces
CREATE POLICY "Users can view webhooks in their workspaces"
  ON webhooks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Only workspace admins can create webhooks
CREATE POLICY "Workspace admins can create webhooks"
  ON webhooks FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Only workspace admins can update webhooks
CREATE POLICY "Workspace admins can update webhooks"
  ON webhooks FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Only workspace admins can delete webhooks
CREATE POLICY "Workspace admins can delete webhooks"
  ON webhooks FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for webhook_logs
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Users can view webhook logs for their workspace webhooks
CREATE POLICY "Users can view webhook logs in their workspaces"
  ON webhook_logs FOR SELECT
  USING (
    webhook_id IN (
      SELECT w.id FROM webhooks w
      WHERE w.workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- System can insert webhook logs (via service role)
-- No user-facing INSERT policy needed

-- Updated_at trigger for webhooks
CREATE OR REPLACE FUNCTION update_webhook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_updated_at();

-- Function to trigger webhooks for task events
CREATE OR REPLACE FUNCTION trigger_task_webhooks()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  event_type TEXT;
  payload JSONB;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    event_type := 'task.created';
    payload := row_to_json(NEW)::jsonb;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if task was completed
    IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
      event_type := 'task.completed';
    ELSE
      event_type := 'task.updated';
    END IF;
    payload := jsonb_build_object(
      'before', row_to_json(OLD)::jsonb,
      'after', row_to_json(NEW)::jsonb
    );
  ELSIF TG_OP = 'DELETE' THEN
    event_type := 'task.deleted';
    payload := row_to_json(OLD)::jsonb;
  END IF;

  -- Find all active webhooks for this workspace and event
  FOR webhook_record IN
    SELECT id, url, secret
    FROM webhooks
    WHERE workspace_id = COALESCE(NEW.workspace_id, OLD.workspace_id)
      AND active = TRUE
      AND event_type = ANY(events)
  LOOP
    -- Queue webhook delivery (will be processed by Edge Function)
    INSERT INTO webhook_logs (webhook_id, event_type, payload, success)
    VALUES (webhook_record.id, event_type, payload, FALSE);
    
    -- Call Edge Function to deliver webhook (async)
    PERFORM extensions.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/deliver-webhook',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'webhook_id', webhook_record.id,
        'event_type', event_type,
        'payload', payload
      )
    );
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for task webhooks
CREATE TRIGGER task_webhook_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_webhooks();

-- Function to clean up old webhook logs (retain last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_logs
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND success = TRUE; -- Only delete successful logs
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function to generate webhook secret
CREATE OR REPLACE FUNCTION generate_webhook_secret()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Views for webhook analytics
CREATE OR REPLACE VIEW webhook_stats AS
SELECT 
  w.id,
  w.name,
  w.workspace_id,
  w.active,
  w.success_count,
  w.failure_count,
  CASE 
    WHEN (w.success_count + w.failure_count) > 0 
    THEN ROUND((w.success_count::DECIMAL / (w.success_count + w.failure_count)) * 100, 2)
    ELSE 0
  END as success_rate,
  COUNT(wl.id) as total_deliveries,
  COUNT(wl.id) FILTER (WHERE wl.success = TRUE) as successful_deliveries,
  COUNT(wl.id) FILTER (WHERE wl.success = FALSE) as failed_deliveries,
  AVG(wl.duration_ms) FILTER (WHERE wl.success = TRUE) as avg_response_time_ms,
  MAX(wl.delivered_at) as last_delivery_at
FROM webhooks w
LEFT JOIN webhook_logs wl ON w.id = wl.webhook_id
GROUP BY w.id;

COMMENT ON TABLE webhooks IS 'Webhook configurations for external integrations';
COMMENT ON TABLE webhook_logs IS 'Delivery logs for all webhook attempts';
COMMENT ON VIEW webhook_stats IS 'Aggregated webhook delivery statistics';
