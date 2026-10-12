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
