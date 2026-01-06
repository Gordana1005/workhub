# Create Cron Job in Supabase

## Step 1: Click "Create job" button (green button in top right)

## Step 2: Fill in the form with these exact values:

### Name
```
generate-recurring-tasks
```

### Schedule (cron expression)
```
0 0 * * *
```
(This means: Every day at midnight UTC)

### Command (SQL)
```sql
SELECT net.http_post(
  url := 'https://miqwspnfqdqrwkdqviif.supabase.co/functions/v1/generate-recurring-tasks',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_89F45YGw-j1jO-zogTR8PQ_-zb8VD5w"}'::jsonb,
  body := '{}'::jsonb
);
```

## Step 3: Click "Create" or "Save"

## Done!

The cron job will now run automatically every day at midnight and generate any recurring tasks that are due.

---

## To Test It Works:

After creating the job, you can manually trigger it by running this in SQL Editor:

```sql
SELECT net.http_post(
  url := 'https://miqwspnfqdqrwkdqviif.supabase.co/functions/v1/generate-recurring-tasks',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_89F45YGw-j1jO-zogTR8PQ_-zb8VD5w"}'::jsonb,
  body := '{}'::jsonb
);
```

This will call your Edge Function immediately without waiting for midnight.
