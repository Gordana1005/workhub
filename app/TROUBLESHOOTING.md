# 🔴 EMERGENCY TROUBLESHOOTING

## Still Getting "infinite recursion detected in policy for relation workspace_members"?

### ⚠️ THE PROBLEM

Supabase detects infinite recursion when a policy on `workspace_members` tries to query `workspace_members` itself in the `USING` or `WITH CHECK` clause.

### ✅ SOLUTION 1: Run CRITICAL_FIX.sql (RECOMMENDED)

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Open `CRITICAL_FIX.sql` from your repository
4. **Copy the ENTIRE file**
5. Paste into SQL Editor
6. Click **"Run"**
7. Check output - should say "DROP POLICY" and "CREATE POLICY" multiple times

### ✅ SOLUTION 2: Disable RLS Temporarily (TESTING ONLY)

If you just want to test if your app works:

```sql
-- DISABLE RLS on workspace_members (TEMPORARY!)
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
```

**WARNING**: This makes your data publicly accessible! Only for testing!

To re-enable later:
```sql
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
```

### ✅ SOLUTION 3: Manual Policy Deletion

1. Go to **Authentication** → **Policies**
2. Search for `workspace_members`
3. Click on each policy
4. Click **"Delete"**
5. Confirm deletion
6. **Delete ALL policies** on workspace_members
7. Then run CRITICAL_FIX.sql

### ✅ SOLUTION 4: Check Existing Policies

Run this query to see what policies exist:

```sql
SELECT 
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'workspace_members';
```

If you see **ANY** policy with `workspace_members` mentioned in the `using_clause` or `with_check_clause`, that's your problem!

### 🔍 HOW TO IDENTIFY THE PROBLEM POLICY

Look for policies that have SQL like:

```sql
-- BAD - causes recursion
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
)
```

This is recursive because it queries `workspace_members` while applying a policy on `workspace_members`!

### ✅ CORRECT NON-RECURSIVE POLICIES

```sql
-- GOOD - no recursion
USING (user_id = auth.uid())

-- GOOD - allows all reads
USING (true)

-- BAD - causes recursion
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members ...)
)
```

## 🎯 After Fixing

1. **Test workspace creation**:
   - Go to your app
   - Try creating a workspace
   - Should work instantly without errors

2. **Test project creation**:
   - Select a workspace
   - Go to Projects page
   - Click "New Project"
   - Button should be clickable
   - Create a project
   - Should appear in list

3. **Check for errors**:
   - Open browser console (F12)
   - Look for any red errors
   - If you see RLS errors, policies are still wrong

## 🚨 If STILL Not Working

### Check #1: RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'workspace_members';
```

Should return: `rowsecurity = true`

### Check #2: User is Authenticated

In your app console:
```javascript
const { data: { user } } = await supabase.auth.getUser()
console.log('User ID:', user?.id)
```

Should return a UUID, not null!

### Check #3: Policies Exist

```sql
SELECT count(*) as policy_count
FROM pg_policies
WHERE tablename = 'workspace_members';
```

Should return: `policy_count = 4` (or more)

### Check #4: Test Direct Insert

Run this in SQL Editor:

```sql
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES (
  'some-workspace-uuid',
  auth.uid(),
  'admin'
);
```

If this fails with "infinite recursion", policies are STILL wrong!

## 📞 Need More Help?

1. Run `CRITICAL_FIX.sql` completely
2. Check browser console for errors
3. Check Supabase logs: Dashboard → Logs → API
4. Share the exact error message

## 🎉 Success Indicators

- ✅ No "infinite recursion" errors
- ✅ Workspaces create instantly
- ✅ Projects page loads quickly
- ✅ "New Project" button is clickable
- ✅ Projects appear in list after creation
