# 🚀 YOUR SUPABASE IS 99% READY!

## ✅ What's Already Done:

1. **Project Linked** ✅
   - Project ID: `miqwspnfqdqrwkdqviif`
   - Status: Connected

2. **Edge Functions Deployed** ✅
   - `generate-recurring-tasks` ✅
   - `deliver-webhook` ✅
   - View them: https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif/functions

---

## 📋 Final Steps (DO THESE NOW):

### Step 1: Apply Database Schema (5 minutes)

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif/editor
   - Click **SQL Editor** in left sidebar
   - Click **New Query**

2. **Copy and paste this file:**
   - Open: `C:\Users\Mile\Desktop\workhub\apply-all-schemas.sql`
   - Select ALL content (Ctrl+A)
   - Copy (Ctrl+C)
   - Paste into SQL Editor

3. **Run the query:**
   - Click **Run** button (or press Ctrl+Enter)
   - Wait for "DEPLOYMENT COMPLETE" message
   - Should see: webhooks, webhook_logs tables created

**Alternative (if SQL Editor doesn't work):**
```bash
# Get your database password from:
# https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif/settings/database

# Then run in PowerShell:
psql "postgresql://postgres:[YOUR-PASSWORD]@db.miqwspnfqdqrwkdqviif.supabase.co:5432/postgres" < apply-all-schemas.sql
```

---

### Step 2: Enable Required Extensions (2 minutes)

1. **Go to Extensions:**
   - https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif/database/extensions

2. **Enable these 3 extensions:**
   - ✅ `uuid-ossp` - UUID generation (probably already enabled)
   - ✅ `http` - HTTP requests from database ⚠️ **REQUIRED for webhooks!**
   - ✅ `pg_cron` - Scheduled jobs ⚠️ **REQUIRED for recurring tasks!**

3. **Search and click "Enable"** for each one

---

### Step 3: Set Up Cron Job (3 minutes)

1. **Go to Cron Jobs:**
   - https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif/database/cron

2. **Create New Cron Job:**
   - Click **Create a new cron job**

3. **Fill in the form:**
   ```
   Name: generate-recurring-tasks
   
   Schedule: 0 0 * * *
   (This means: daily at midnight UTC)
   
   SQL Command:
   SELECT net.http_post(
     url:='https://miqwspnfqdqrwkdqviif.supabase.co/functions/v1/generate-recurring-tasks',
     headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
     body:='{}'::jsonb
   ) as request_id;
   ```

4. **Get YOUR_ANON_KEY:**
   - Go to: https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif/settings/api
   - Copy the `anon` `public` key (starts with `eyJ...`)
   - Replace `YOUR_ANON_KEY` in the SQL command above

5. **Click Create**

---

### Step 4: Update Your App Environment Variables (1 minute)

1. **Open:** `C:\Users\Mile\Desktop\workhub\app\.env.local`

2. **Add these lines:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://miqwspnfqdqrwkdqviif.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
   ```

3. **Get the values from:**
   - https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif/settings/api
   - Copy `URL` and `anon public` key

---

### Step 5: Configure Edge Function Secrets (2 minutes)

Run these commands in PowerShell:

```powershell
cd C:\Users\Mile\Desktop\workhub

# Get your Service Role Key from:
# https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif/settings/api
# Copy the "service_role" "secret" key

# Set the secrets (replace YOUR_SERVICE_ROLE_KEY with actual key)
npx supabase secrets set SUPABASE_URL=https://miqwspnfqdqrwkdqviif.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Verify secrets were set
npx supabase secrets list
```

---

## ✅ Verification Checklist

After completing all steps above, verify:

- [ ] SQL script ran successfully (saw "DEPLOYMENT COMPLETE")
- [ ] Extensions enabled: uuid-ossp ✅, http ✅, pg_cron ✅
- [ ] Cron job created and shows in dashboard
- [ ] Environment variables updated in .env.local
- [ ] Edge Function secrets configured

---

## 🧪 Test It Out!

### Test 1: Check Tables
```sql
-- Run in SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('webhooks', 'webhook_logs', 'tasks', 'workspaces');
-- Should show 4 tables
```

### Test 2: Test Recurring Tasks Function
```powershell
# Run in PowerShell
curl -X POST https://miqwspnfqdqrwkdqviif.supabase.co/functions/v1/generate-recurring-tasks `
  -H "Authorization: Bearer YOUR_ANON_KEY" `
  -H "Content-Type: application/json"

# Should return: {"success": true, "tasksGenerated": 0}
```

### Test 3: Create a Webhook
1. Start your app: `cd app && npm run dev`
2. Go to: http://localhost:3000/dashboard/settings/webhooks
3. Create a test webhook
4. Verify it appears in the list

---

## 🎉 YOU'RE DONE!

Once you complete the 5 steps above, WorkHub is **100% deployed** to Supabase!

**Your Project Dashboard:**
https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif

**API Endpoints:**
- URL: `https://miqwspnfqdqrwkdqviif.supabase.co`
- REST API: `https://miqwspnfqdqrwkdqviif.supabase.co/rest/v1/`
- Edge Functions: `https://miqwspnfqdqrwkdqviif.supabase.co/functions/v1/`

**Need Help?**
- Supabase Logs: https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif/logs
- Edge Functions: https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif/functions
- Database: https://supabase.com/dashboard/project/miqwspnfqdqrwkdqviif/editor

---

**Total Time:** ~15 minutes to complete all 5 steps! 🚀
