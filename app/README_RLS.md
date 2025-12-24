# Understanding the RLS Infinite Recursion Issue

## What Happened?

You got this error:
```
infinite recursion detected in policy for relation "workspace_members"
```

## Why It Happened

Supabase Row Level Security (RLS) policies were checking the `workspace_members` table **while trying to insert/query** the `workspace_members` table.

### Example of BAD Policy (Causes Recursion)

```sql
CREATE POLICY "Users can view workspace members"
ON workspace_members
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members  -- 🔴 RECURSION HERE!
    WHERE user_id = auth.uid()
  )
);
```

**Why it fails:**
1. User tries to SELECT from `workspace_members`
2. Policy needs to check if user is member
3. To check membership, it SELECTs from `workspace_members`
4. Which triggers the policy again
5. Which checks membership again
6. Which SELECTs from `workspace_members` again
7. ... infinite loop! 🔁

## The Fix

Use policies that **don't reference the same table**:

### GOOD Policy (No Recursion)

```sql
CREATE POLICY "allow_read_all_members"
ON workspace_members
FOR SELECT
USING (true);  -- ✅ No recursion - just allow all reads
```

Or:

```sql
CREATE POLICY "allow_insert_own_membership"
ON workspace_members
FOR INSERT
WITH CHECK (user_id = auth.uid());  -- ✅ Direct check, no subquery
```

## Files to Use

1. **`QUICK_FIX.md`** - Fast 2-minute fix
2. **`CRITICAL_FIX.sql`** - Complete SQL script
3. **`TROUBLESHOOTING.md`** - If still having issues
4. **`SUPABASE_SETUP.md`** - Full documentation

## General Rules to Avoid Recursion

✅ **DO:**
- Use `auth.uid()` directly
- Use `true` for permissive policies (during development)
- Reference OTHER tables (like `workspaces`, `projects`)
- Use simple equality checks (`column = auth.uid()`)

❌ **DON'T:**
- Query the SAME table in the policy
- Use subqueries that reference the policy's table
- Create circular dependencies between policies

## Example: Safe Policy Structure

```sql
-- ✅ SAFE: Check projects table from tasks policy
CREATE POLICY "members_can_view_tasks"
ON tasks
USING (
  project_id IN (
    SELECT id FROM projects  -- Different table, no recursion
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  )
);

-- ❌ UNSAFE: Check workspace_members from workspace_members policy  
CREATE POLICY "members_can_view_members"
ON workspace_members
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members  -- SAME table = recursion!
    WHERE user_id = auth.uid()
  )
);
```

## For Production

Once everything works, you can tighten security:

```sql
-- More restrictive: only see members of your workspaces
-- But uses a FUNCTION to avoid recursion
CREATE OR REPLACE FUNCTION user_workspaces()
RETURNS TABLE(workspace_id uuid) AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "members_can_view_workspace_members"
ON workspace_members
FOR SELECT
USING (workspace_id IN (SELECT user_workspaces()));
```

Using a FUNCTION breaks the recursion because Postgres treats it differently!
