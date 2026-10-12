-- 023: Web Push subscriptions, per-user notification preferences, recurring-task helpers.
-- Idempotent: safe to run multiple times. The application degrades gracefully until this is applied.

-- 1. Push subscriptions (one row per browser/device endpoint)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      text NOT NULL UNIQUE,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
      AND policyname = 'Users manage own push subscriptions'
  ) THEN
    CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
      FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

-- 2. Notification preferences on profiles, e.g. {"daily_digest": false}
--    Missing key / empty object means "default" (daily digest ON).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Recurring tasks: the cron / task completion creates the next occurrence from
--    tasks.recurrence_pattern (added in 016_task_enhancements.sql). This index only speeds up that scan.
CREATE INDEX IF NOT EXISTS idx_tasks_recurring
  ON public.tasks(workspace_id)
  WHERE recurrence_pattern IS NOT NULL;
