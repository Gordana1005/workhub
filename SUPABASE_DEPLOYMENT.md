# Supabase Deployment Guide

Complete step-by-step instructions for deploying WorkHub to Supabase.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Install globally
   ```bash
   npm install -g supabase
   ```
3. **Project Access Token**: Generate from Supabase Dashboard

## Step 1: Link Your Supabase Project

```bash
# Navigate to project root
cd C:\Users\Mile\Desktop\workhub

# Login to Supabase
supabase login

# Link to your project (you'll need your project ref)
supabase link --project-ref YOUR_PROJECT_REF
```

**Find your project ref:**
- Go to https://supabase.com/dashboard/project/_/settings/general
- Copy the "Reference ID" (looks like: abcdefghijklmnop)

## Step 2: Apply Database Schema

### Option A: Using Supabase Dashboard (Recommended for first deployment)

1. Go to https://supabase.com/dashboard/project/_/editor
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. Copy and paste content from these files **in order**:

   **First:** `database-webhooks.sql`
   ```sql
   -- Creates webhooks, webhook_logs tables
   -- Sets up triggers and RLS policies
   ```

   **Second:** `add-task-categories.sql` (if not already applied)
   ```sql
   -- Adds task categories
   ```

   **Third:** `schema-enhancements.sql` (if not already applied)
   ```sql
   -- Adds notifications, task_templates, etc.
   ```

5. Click **Run** for each query
6. Verify no errors in output panel

### Option B: Using Supabase CLI

```bash
# Apply database schema
supabase db push

# Or apply specific migration files
psql "$DATABASE_URL" < database-webhooks.sql
```

## Step 3: Deploy Edge Functions

### 3A: Deploy Automated Task Generation Function

```bash
cd supabase/functions/generate-recurring-tasks

# Deploy the function
supabase functions deploy generate-recurring-tasks

# Verify deployment
supabase functions list
```

**Set up cron schedule:**
1. Go to https://supabase.com/dashboard/project/_/database/cron
2. Click **Create a new cron job**
3. Configure:
   - **Name**: `generate-recurring-tasks`
   - **Schedule**: `0 0 * * *` (runs daily at midnight UTC)
   - **SQL Command**:
     ```sql
     SELECT
       net.http_post(
         url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-recurring-tasks',
         headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
         body:='{}'::jsonb
       ) as request_id;
     ```
4. Click **Create**

**Get your credentials:**
- Project URL: `https://YOUR_PROJECT_REF.supabase.co`
- Anon Key: Dashboard → Settings → API → `anon` `public` key

### 3B: Deploy Webhook Delivery Function

```bash
cd supabase/functions/deliver-webhook

# Deploy the function
supabase functions deploy deliver-webhook

# Verify deployment
supabase functions list
```

**Important:** This function is called by database triggers, not by cron.

## Step 4: Configure Environment Variables

### For Edge Functions

```bash
# Set Supabase URL and Service Role Key
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Verify secrets
supabase secrets list
```

**Get Service Role Key:**
- Dashboard → Settings → API → `service_role` `secret` key
- ⚠️ **NEVER commit this to git!**

### For Next.js App

Update `app/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Step 5: Enable Required Extensions

Go to Database → Extensions and enable:
- ✅ `uuid-ossp` - UUID generation
- ✅ `http` - HTTP requests from database (for webhooks)
- ✅ `pg_cron` - Scheduled jobs

## Step 6: Verify Database Setup

Run this verification query in SQL Editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'workspaces', 'tasks', 'projects', 'time_entries', 
    'notifications', 'task_templates', 'webhooks', 'webhook_logs'
  )
ORDER BY table_name;

-- Should return 8 tables

-- Check if triggers exist
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%webhook%';

-- Should return task webhook triggers

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('webhooks', 'webhook_logs');

-- Both should show rowsecurity = true
```

## Step 7: Test Edge Functions

### Test Recurring Tasks Function

```bash
# Using curl
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-recurring-tasks \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Should return:
# {"success": true, "tasksGenerated": 0}
# (0 if no recurring tasks exist yet)
```

### Test Webhook Delivery Function

```bash
# Create a test webhook first via UI or SQL:
INSERT INTO webhooks (workspace_id, name, url, events, secret)
VALUES (
  'YOUR_WORKSPACE_ID',
  'Test Webhook',
  'https://webhook.site/YOUR_UNIQUE_URL',
  ARRAY['task.created'],
  'test-secret-key'
);

# Trigger it by creating a task
# The webhook should fire automatically
```

## Step 8: Monitor Function Logs

```bash
# View logs for recurring tasks function
supabase functions logs generate-recurring-tasks

# View logs for webhook function
supabase functions logs deliver-webhook

# Follow logs in real-time
supabase functions logs generate-recurring-tasks --follow
```

## Step 9: Set Up Database Backups

1. Go to Dashboard → Settings → Database → Backups
2. Enable **Point-in-Time Recovery (PITR)** for production
3. Configure backup schedule (daily recommended)

## Troubleshooting

### Edge Function Not Deploying

```bash
# Check Deno version
deno --version

# Re-link project
supabase link --project-ref YOUR_PROJECT_REF

# Try deploying with verbose output
supabase functions deploy generate-recurring-tasks --debug
```

### Database Schema Errors

```bash
# Reset local database (DANGER: deletes all data)
supabase db reset

# Or drop specific tables
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
```

### RLS Policy Issues

```sql
-- Check current user's role
SELECT current_user, current_database();

-- Temporarily disable RLS for testing (NOT for production!)
ALTER TABLE webhooks DISABLE ROW LEVEL SECURITY;

-- Re-enable when done
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
```

### Webhook Not Firing

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'task_webhook_trigger';

-- Check webhook logs
SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 10;

-- Check if webhook is active
SELECT id, name, active, events FROM webhooks;
```

## Production Checklist

- [ ] All database migrations applied
- [ ] Both Edge Functions deployed
- [ ] Cron job configured for recurring tasks
- [ ] Environment variables set correctly
- [ ] Extensions enabled (uuid-ossp, http, pg_cron)
- [ ] RLS policies tested
- [ ] Backups configured
- [ ] Function logs monitored
- [ ] Service role key secured (not in git)
- [ ] Test webhooks with RequestBin
- [ ] PWA icons generated and deployed
- [ ] Build errors resolved (npm run build)
- [ ] Production environment variables set

## Useful Commands Reference

```bash
# Supabase CLI
supabase login                          # Login to Supabase
supabase projects list                  # List all projects
supabase link --project-ref REF         # Link to project
supabase db push                        # Push migrations
supabase functions deploy NAME          # Deploy function
supabase functions logs NAME            # View logs
supabase secrets set KEY=VALUE          # Set secret
supabase secrets list                   # List secrets

# Database
psql $DATABASE_URL                      # Connect to database
psql $DATABASE_URL < file.sql           # Execute SQL file

# Testing
curl -X POST URL -H "Auth: Bearer KEY"  # Test endpoints
```

## Next Steps After Deployment

1. **Create Admin User**: Run `app/create-admin.mjs`
2. **Create Test Data**: Run `app/scripts/create-test-data.sql`
3. **Test All Features**: Follow `TESTING_GUIDE.md`
4. **Monitor Performance**: Check Dashboard → Logs & Analytics
5. **Set Up Alerts**: Configure email alerts for errors

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs
- WorkHub Issues: Check `BUGFIXES_JAN2.md`
- Edge Functions: See individual README.md files
