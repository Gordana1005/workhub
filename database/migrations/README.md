# Database Migrations

This folder contains SQL migration files to enhance WorkHub's database performance and security.

## Available Migrations

### 007_performance_indexes.sql
**Purpose:** Optimize database query performance  
**Impact:** Significantly faster queries, especially for large datasets  
**Safe to run:** Yes (only adds indexes, no data changes)

**Features:**
- Workspace and project-based query indexes
- Composite indexes for common filter combinations
- Full-text search indexes (GIN) for tasks, notes, and projects
- Date range query optimization
- User lookup optimization

**Run this if:**
- You have more than 1000 tasks/notes
- Search is slow
- Dashboard loads slowly
- Reports take too long to generate

### 008_security_constraints.sql
**Purpose:** Add database-level data validation and security  
**Impact:** Prevents invalid data, ensures consistency  
**Safe to run:** Yes (uses IF NOT EXISTS checks)

**Features:**
- Valid priority values (low, medium, high, urgent)
- Valid user roles (admin, member)
- Task status consistency (completed tasks must have completed_at)
- Positive time entry durations
- Unique email per workspace for invitations
- Prevent self-referencing task dependencies
- Valid project status values
- Email format validation

**Run this if:**
- You want to prevent invalid data entry
- You need stricter data integrity
- You're launching to production

## How to Apply Migrations

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the contents of the migration file
6. Paste into the SQL editor
7. Click "Run" (bottom right)
8. Verify success in the output panel

### Option 2: Via Supabase CLI
```bash
# Make sure you're in the project root
cd c:/Users/Mile/Desktop/workhub

# Login to Supabase (if not already)
supabase login

# Link to your project (first time only)
supabase link --project-ref your-project-ref

# Apply a specific migration
supabase db push --include database/migrations/007_performance_indexes.sql

# Or apply all pending migrations
supabase db push
```

### Option 3: Via psql (Direct Database Access)
```bash
# Connect to your Supabase database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Run migration
\i database/migrations/007_performance_indexes.sql
\i database/migrations/008_security_constraints.sql

# Exit
\q
```

## Recommended Order

1. **First:** 007_performance_indexes.sql (improves performance)
2. **Second:** 008_security_constraints.sql (adds data validation)

## Rollback (if needed)

### To remove indexes (007):
```sql
-- Drop performance indexes
DROP INDEX IF EXISTS idx_tasks_workspace_id;
DROP INDEX IF EXISTS idx_projects_workspace_id;
-- ... (see migration file for complete list)
```

### To remove constraints (008):
```sql
-- Drop security constraints
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
-- ... (see migration file for complete list)
```

## Verification

After running migrations, verify they were applied:

```sql
-- Check indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check constraints
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE (conname LIKE '%_check' OR conname LIKE '%_unique')
  AND connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;
```

## Performance Impact

### Before Indexes (estimated):
- Task list query: ~500ms (10k tasks)
- Search query: ~1000ms
- Dashboard load: ~2000ms

### After Indexes (estimated):
- Task list query: ~50ms (10k tasks) ⚡ 10x faster
- Search query: ~100ms ⚡ 10x faster
- Dashboard load: ~300ms ⚡ 6x faster

## Troubleshooting

### "relation does not exist" error
**Solution:** Make sure the table exists. Check schema with:
```sql
\dt
```

### "constraint already exists" error
**Solution:** Safe to ignore. The migration uses IF NOT EXISTS checks.

### "permission denied" error
**Solution:** Make sure you're connected as the database owner or have sufficient privileges.

### Migration takes too long
**Solution:** This is normal for large datasets. Indexes can take several minutes to build. Don't interrupt the process.

## Need Help?

- Check Supabase docs: https://supabase.com/docs/guides/database
- Review existing schema: See `database/database-schema.sql`
- Check current indexes: Run the verification query above
