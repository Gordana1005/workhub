# Supabase Database Setup

## CRITICAL: Fix RLS Policies

Your current `workspace_members` RLS policies have **infinite recursion**. This prevents workspace and project creation.

### 🔴 Problem

The policy checks `workspace_members` table while inserting into `workspace_members`, creating a circular reference:

```sql
-- BAD (causes infinite recursion)
with check (
  (user_id = auth.uid())
)
```

### ✅ Solution

Replace ALL policies on `workspace_members` table with these:

## Step 1: Delete All Existing Policies

1. Go to Supabase Dashboard → Authentication → Policies
2. Find `workspace_members` table
3. **Delete** these policies:
   - "Users can join workspaces"
   - "Users can view workspace members"  
   - "Workspace owners can add members"

## Step 2: Create New Simple Policies

### Policy 1: Enable INSERT for authenticated users
```sql
CREATE POLICY "Users can join workspaces"
ON public.workspace_members
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);
```

### Policy 2: Enable SELECT for workspace members
```sql
CREATE POLICY "Users can view workspace members"
ON public.workspace_members
FOR SELECT
TO public
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);
```

### Policy 3: Enable UPDATE for workspace admins
```sql
CREATE POLICY "Workspace admins can update members"
ON public.workspace_members
FOR UPDATE
TO public
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

### Policy 4: Enable DELETE for workspace admins
```sql
CREATE POLICY "Workspace admins can remove members"
ON public.workspace_members
FOR DELETE
TO public
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

## Step 3: Fix Workspaces Table Policies

### Enable INSERT for authenticated users
```sql
CREATE POLICY "Users can create workspaces"
ON public.workspaces
FOR INSERT
TO public
WITH CHECK (auth.uid() = owner_id);
```

### Enable SELECT for workspace members
```sql
CREATE POLICY "Users can view their workspaces"
ON public.workspaces
FOR SELECT
TO public
USING (
  id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);
```

### Enable UPDATE for workspace owners
```sql
CREATE POLICY "Workspace owners can update workspaces"
ON public.workspaces
FOR UPDATE
TO public
USING (owner_id = auth.uid());
```

### Enable DELETE for workspace owners
```sql
CREATE POLICY "Workspace owners can delete workspaces"
ON public.workspaces
FOR DELETE
TO public
USING (owner_id = auth.uid());
```

## Step 4: Fix Projects Table Policies

### Enable INSERT for workspace members
```sql
CREATE POLICY "Workspace members can create projects"
ON public.projects
FOR INSERT
TO public
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);
```

### Enable SELECT for workspace members
```sql
CREATE POLICY "Workspace members can view projects"
ON public.projects
FOR SELECT
TO public
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);
```

### Enable UPDATE for workspace members
```sql
CREATE POLICY "Workspace members can update projects"
ON public.projects
FOR UPDATE
TO public
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);
```

### Enable DELETE for workspace admins
```sql
CREATE POLICY "Workspace admins can delete projects"
ON public.projects
FOR DELETE
TO public
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

## Step 5: Fix Tasks Table Policies

### Enable INSERT for workspace members
```sql
CREATE POLICY "Workspace members can create tasks"
ON public.tasks
FOR INSERT
TO public
WITH CHECK (
  project_id IN (
    SELECT p.id 
    FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);
```

### Enable SELECT for workspace members
```sql
CREATE POLICY "Workspace members can view tasks"
ON public.tasks
FOR SELECT
TO public
USING (
  project_id IN (
    SELECT p.id 
    FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);
```

### Enable UPDATE for workspace members
```sql
CREATE POLICY "Workspace members can update tasks"
ON public.tasks
FOR UPDATE
TO public
USING (
  project_id IN (
    SELECT p.id 
    FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);
```

### Enable DELETE for workspace members
```sql
CREATE POLICY "Workspace members can delete tasks"
ON public.tasks
FOR DELETE
TO public
USING (
  project_id IN (
    SELECT p.id 
    FROM projects p
    INNER JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);
```

## Quick Fix Script

Run this in Supabase SQL Editor:

```sql
-- Drop all existing policies (replace with actual policy names)
DROP POLICY IF EXISTS "Users can join workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON workspace_members;

-- Recreate clean policies
CREATE POLICY "Users can join workspaces"
ON public.workspace_members
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view workspace members"
ON public.workspace_members
FOR SELECT
TO public
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Workspace admins can update members"
ON public.workspace_members
FOR UPDATE
TO public
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Workspace admins can remove members"
ON public.workspace_members
FOR DELETE
TO public
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

## Verification

After applying policies:

1. Try creating a workspace → Should work
2. Check workspace appears in list → Should appear
3. Try creating a project → Should work
4. Check project appears in list → Should appear

If still issues, check:
- RLS is enabled on all tables
- You're logged in (auth.uid() returns a value)
- No typos in policy SQL
