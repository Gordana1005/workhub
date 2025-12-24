# ⚡ QUICK FIX - 2 Minutes

## Problem: "infinite recursion detected in policy for relation workspace_members"

## Solution: Run This ONE Command

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New query"**

### Step 2: Copy & Paste This Entire Block

```sql
-- Delete all problematic policies
DROP POLICY IF EXISTS "Users can join workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can remove members" ON workspace_members;

-- Create simple non-recursive policies
CREATE POLICY "allow_insert_own_membership" ON workspace_members
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "allow_read_all_members" ON workspace_members
FOR SELECT TO authenticated USING (true);

CREATE POLICY "allow_update_own_membership" ON workspace_members
FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "allow_delete_own_membership" ON workspace_members
FOR DELETE TO authenticated USING (user_id = auth.uid());
```

### Step 3: Click "Run"

### Step 4: Refresh Your App

### Step 5: Try Creating Workspace Again

## ✅ Should Work Now!

If still not working:
1. Check `TROUBLESHOOTING.md`
2. Or temporarily disable RLS:

```sql
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
```

(Re-enable later with `ENABLE ROW LEVEL SECURITY`)
