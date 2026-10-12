-- =====================================================================================
-- TrackWork - APPLY ME (one paste, safe to run more than once)
-- Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Every section is idempotent. Until you run it, the app keeps working; the features
-- below simply stay disabled / fall back (search indexes, atomic finance helpers, push
-- subscriptions, email-invite columns, subtasks, comment edits + attachments).
-- Sections: 021 search indexes | 022 finance atomic | 023 push | 025 invites | 026 subtasks | 027 comments+attachments
-- =====================================================================================


-- ===== 021_search_indexes =====

-- Migration 021: Global search indexes (OPTIONAL)
-- The search API (/api/search) works without this. These trigram indexes only make
-- ILIKE '%term%' lookups stay fast as tasks / projects / notes grow into the tens of thousands.
-- Idempotent: safe to run more than once.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm
  ON tasks USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_projects_name_trgm
  ON projects USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_notes_title_trgm
  ON notes USING gin (title gin_trgm_ops);

-- ===== 022_finance_atomic =====

-- 022_finance_atomic.sql
-- Atomic account-balance maintenance for finance transactions.
--
-- Background: the balance of finance_accounts.current_balance was changed from
-- the API with read-modify-write (lost updates under concurrency) and edits /
-- deletes of a transaction did not adjust it. The DB trigger from migration 011
-- (account_balance_trigger) already does this atomically for INSERT / UPDATE /
-- DELETE, so the DB trigger stays the single source of truth for every writer
-- (the API and the browser Supabase client used by QuickAdd / Import).
--
-- This migration is idempotent (safe to run any number of times) and:
--   1. finance_transaction_delta()       - pure signed delta of one transaction
--   2. adjust_account_balance()          - atomic "balance = balance + delta" RPC
--   3. update_account_balance() + trigger - hardened, re-asserted trigger
--   4. finance_balance_trigger_active()  - lets the API know the DB owns balances
--   5. recalculate_finance_balances()    - optional repair helper (NOT auto-run)
--
-- Transfers: a transfer row only has one account_id and no destination, so it
-- has no balance effect (delta 0), matching the trigger from migration 011.
-- Nothing here is SECURITY DEFINER; the API calls these with the service role.

-- 1. Signed balance effect of a transaction: income +, expense -, transfer 0
CREATE OR REPLACE FUNCTION finance_transaction_delta(p_type text, p_amount numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_type = 'income'  THEN COALESCE(p_amount, 0)
    WHEN p_type = 'expense' THEN -COALESCE(p_amount, 0)
    ELSE 0
  END
$$;

-- 2. Atomic balance adjustment. Returns the new balance (NULL if no such account).
CREATE OR REPLACE FUNCTION adjust_account_balance(p_account_id uuid, p_delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF p_account_id IS NULL OR p_delta IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE finance_accounts
     SET current_balance = COALESCE(current_balance, 0) + p_delta,
         updated_at = NOW()
   WHERE id = p_account_id
  RETURNING current_balance INTO v_balance;

  RETURN v_balance;
END;
$$;

REVOKE ALL ON FUNCTION adjust_account_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION adjust_account_balance(uuid, numeric) TO service_role;

-- 3. Trigger function: one atomic statement per affected account. It runs as the
--    calling user (like before, so browser inserts keep working under RLS) and
--    therefore updates finance_accounts directly instead of via the service-role RPC.
--    INSERT: apply new; DELETE: reverse old; UPDATE: reverse old on the old
--    account and apply new on the new account (account / type / amount edits).
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_old numeric;
  v_new numeric;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old := finance_transaction_delta(OLD.type, OLD.amount);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new := finance_transaction_delta(NEW.type, NEW.amount);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_new <> 0 THEN
      UPDATE finance_accounts SET current_balance = COALESCE(current_balance, 0) + v_new, updated_at = NOW() WHERE id = NEW.account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF v_old <> 0 THEN
      UPDATE finance_accounts SET current_balance = COALESCE(current_balance, 0) - v_old, updated_at = NOW() WHERE id = OLD.account_id;
    END IF;
  ELSE
    IF OLD.account_id IS NOT DISTINCT FROM NEW.account_id THEN
      IF v_new - v_old <> 0 THEN
        UPDATE finance_accounts SET current_balance = COALESCE(current_balance, 0) + (v_new - v_old), updated_at = NOW() WHERE id = NEW.account_id;
      END IF;
    ELSE
      IF v_old <> 0 THEN
        UPDATE finance_accounts SET current_balance = COALESCE(current_balance, 0) - v_old, updated_at = NOW() WHERE id = OLD.account_id;
      END IF;
      IF v_new <> 0 THEN
        UPDATE finance_accounts SET current_balance = COALESCE(current_balance, 0) + v_new, updated_at = NOW() WHERE id = NEW.account_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS account_balance_trigger ON finance_transactions;
CREATE TRIGGER account_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON finance_transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- 4. Capability probe used by the API: true when the DB trigger maintains balances,
--    in which case the API must NOT also adjust them (that would double count).
CREATE OR REPLACE FUNCTION finance_balance_trigger_active()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM pg_trigger t
     WHERE t.tgrelid = 'public.finance_transactions'::regclass
       AND t.tgname = 'account_balance_trigger'
       AND NOT t.tgisinternal
       AND t.tgenabled <> 'D'
  )
$$;

REVOKE ALL ON FUNCTION finance_balance_trigger_active() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION finance_balance_trigger_active() TO service_role;

-- 5. Repair helper (run manually if balances ever drifted, e.g. from the old
--    API double-adjustment):  SELECT recalculate_finance_balances('<workspace uuid>');
--    balance = initial_balance + sum(income) - sum(expense). Returns rows fixed.
CREATE OR REPLACE FUNCTION recalculate_finance_balances(p_workspace_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE finance_accounts a
     SET current_balance = COALESCE(a.initial_balance, 0) + COALESCE((
           SELECT SUM(finance_transaction_delta(t.type, t.amount))
             FROM finance_transactions t
            WHERE t.account_id = a.id
         ), 0),
         updated_at = NOW()
   WHERE (p_workspace_id IS NULL OR a.workspace_id = p_workspace_id)
     AND current_balance IS DISTINCT FROM COALESCE(a.initial_balance, 0) + COALESCE((
           SELECT SUM(finance_transaction_delta(t.type, t.amount))
             FROM finance_transactions t
            WHERE t.account_id = a.id
         ), 0);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION recalculate_finance_balances(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION recalculate_finance_balances(uuid) TO service_role;

-- ===== 023_push_notifications =====

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

-- ===== 025_invitations_email =====

-- 025: e-mail invitations
-- Idempotent. The app keeps working without this migration (the personal message is simply not
-- stored and the resend cooldown / rate-limit stamp is skipped), but apply it to get the full flow.

-- Columns from 017 (no-ops when already applied)
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Personal note the inviter typed (shown in the invite e-mail template as {{ .Data.invite_message }})
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS message text;

-- When the invite e-mail was last sent: powers the 60s resend cooldown and the 20/hour workspace cap
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS last_sent_at timestamp with time zone;

UPDATE invitations SET status = 'pending' WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitations_message_length'
  ) THEN
    ALTER TABLE invitations
      ADD CONSTRAINT invitations_message_length
      CHECK (message IS NULL OR char_length(message) <= 500);
  END IF;
END $$;

-- Rate-limit lookups: "invitations created / sent for this workspace in the last hour"
CREATE INDEX IF NOT EXISTS idx_invitations_workspace_created
  ON invitations (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_workspace_last_sent
  ON invitations (workspace_id, last_sent_at DESC);

-- ===== 026_subtasks =====

-- 026: Subtasks (one level) + per-task time lookups.
-- Idempotent: safe to run multiple times. The application degrades gracefully until this is applied
-- (subtasks simply stay hidden / disabled, task lists keep loading).
--
-- Model: a subtask is a normal row in `tasks` whose parent_task_id points at a top-level task.
-- It inherits workspace_id / project_id from its parent, supports its own title, assignee, due date
-- and completion, and is removed together with the parent (ON DELETE CASCADE).
--
-- NOTE: the legacy supabase/functions/generate-recurring-tasks edge function (superseded by
-- src/lib/recurrence.ts) also used a `parent_task_id` column to link recurring *instances* to their
-- template. If that function was ever deployed against this database and the column already exists
-- with data, those rows would be treated as subtasks by the app. The notice below tells you if any
-- rows already have a parent_task_id before this migration changes anything.

DO $$
DECLARE
  existing_links bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'parent_task_id'
  ) THEN
    EXECUTE 'SELECT count(*) FROM public.tasks WHERE parent_task_id IS NOT NULL' INTO existing_links;
    RAISE NOTICE 'tasks.parent_task_id already exists with % linked row(s)', existing_links;
  END IF;
END $$;

-- 1. Column + index
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON public.tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- 2. A task can never be its own parent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_parent_not_self_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_parent_not_self_check CHECK (parent_task_id IS NULL OR parent_task_id <> id);
  END IF;
END $$;

-- 3. Keep it one level deep and inside one workspace (the API validates this too; this is the safety net)
CREATE OR REPLACE FUNCTION public.enforce_subtask_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_row record;
BEGIN
  IF NEW.parent_task_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT workspace_id, parent_task_id INTO parent_row FROM public.tasks WHERE id = NEW.parent_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent task does not exist';
  END IF;
  IF parent_row.parent_task_id IS NOT NULL THEN
    RAISE EXCEPTION 'Subtasks cannot be nested (a subtask cannot have subtasks)';
  END IF;
  IF parent_row.workspace_id IS DISTINCT FROM NEW.workspace_id THEN
    RAISE EXCEPTION 'A subtask must belong to the same workspace as its parent';
  END IF;
  -- A task that already has subtasks cannot itself become a subtask
  IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM public.tasks WHERE parent_task_id = NEW.id) THEN
    RAISE EXCEPTION 'A task with subtasks cannot become a subtask';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_subtask_rules ON public.tasks;
CREATE TRIGGER trg_enforce_subtask_rules
  BEFORE INSERT OR UPDATE OF parent_task_id, workspace_id ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_subtask_rules();

-- 4. Per-task time lookups (task detail "Time" section, logged-time totals on task rows)
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id_date
  ON public.time_entries(task_id, date DESC)
  WHERE task_id IS NOT NULL;

-- ===== 027_comments_attachments =====

-- 027: task comments (edit marker) + task attachments (table + private storage bucket)
-- Idempotent: safe to run more than once. Run in the Supabase SQL editor as the project owner
-- (creating storage buckets / storage policies needs owner rights).
--
-- The app degrades gracefully while this has not been run: comments still work, "edited" is
-- simply not shown, and the Files tab says that attachments are not set up yet.

create extension if not exists "uuid-ossp";

-- 1) Comments: edit marker -----------------------------------------------------------------
-- The API sets updated_at when a comment is edited; the UI shows "edited" when it is later
-- than created_at.
do $$
begin
  if to_regclass('public.task_notes') is not null then
    alter table public.task_notes add column if not exists updated_at timestamptz default now();
    create index if not exists idx_task_notes_task_created on public.task_notes (task_id, created_at);
  end if;
end $$;

-- 2) Attachment metadata (same shape as 016_file_attachments.sql) ---------------------------
create table if not exists public.file_attachments (
    id uuid primary key default uuid_generate_v4(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    task_id uuid references public.tasks(id) on delete cascade,
    project_id uuid references public.projects(id) on delete cascade,
    note_id uuid references public.notes(id) on delete cascade,
    file_name text not null,
    file_type text,
    file_size bigint,
    storage_path text not null unique,
    version integer not null default 1,
    uploaded_by uuid references public.profiles(id),
    created_at timestamptz not null default now(),
    deleted_at timestamptz,
    constraint file_attachments_target_check check (
        task_id is not null or project_id is not null or note_id is not null
    )
);

create index if not exists idx_file_attachments_workspace on public.file_attachments(workspace_id);
create index if not exists idx_file_attachments_task on public.file_attachments(task_id) where task_id is not null;
create index if not exists idx_file_attachments_uploaded_by on public.file_attachments(uploaded_by);

alter table public.file_attachments enable row level security;

drop policy if exists "Members can view attachments" on public.file_attachments;
create policy "Members can view attachments" on public.file_attachments
    for select using (
        exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = file_attachments.workspace_id
              and wm.user_id = auth.uid()
        )
        and deleted_at is null
    );

-- 3) Private storage bucket for the files ---------------------------------------------------
-- Files are uploaded through signed upload URLs and read through signed download URLs that the
-- API creates with the service role, so the bucket stays private. 10 MB per file.
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit)
  values ('attachments', 'attachments', false, 10485760)
  on conflict (id) do nothing;

  -- a bucket created earlier without a limit gets the limit too
  update storage.buckets
     set file_size_limit = 10485760
   where id = 'attachments' and file_size_limit is null;
exception
  when insufficient_privilege then
    raise notice 'Could not create the attachments bucket: run this migration as the project owner (or create a private bucket named "attachments" with a 10 MB limit in Storage).';
end $$;

-- Defence in depth: signed-in users can only read objects of workspaces they belong to
-- (object keys look like <workspace_id>/<task_id>/<uuid>-<file name>). All writes go through
-- the API, so no insert/update/delete policies are created.
do $$
begin
  drop policy if exists "Members can read workspace attachments" on storage.objects;
  create policy "Members can read workspace attachments" on storage.objects
    for select to authenticated
    using (
      bucket_id = 'attachments'
      and exists (
        select 1 from public.workspace_members wm
        where wm.user_id = auth.uid()
          and wm.workspace_id::text = (storage.foldername(name))[1]
      )
    );
exception
  when insufficient_privilege then
    raise notice 'Could not create the storage policy: run this migration as the project owner.';
end $$;
