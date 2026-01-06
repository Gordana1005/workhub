# Supabase Edge Function: Generate Recurring Tasks

## Overview
This Edge Function automatically generates task instances from recurring task templates. It runs daily at midnight UTC via cron schedule.

## How It Works

### 1. Query Recurring Templates
- Selects all active tasks with `recurrence_pattern` set
- Filters out task instances (only processes parent templates)
- Checks if recurrence end date hasn't passed

### 2. Pattern Matching
The function supports 4 recurrence frequencies:

**Daily:**
```json
{
  "frequency": "daily",
  "interval": 1
}
```
Generates task every N days (interval = 1 means every day)

**Weekly:**
```json
{
  "frequency": "weekly",
  "daysOfWeek": [1, 3, 5]
}
```
Generates on specific days (0=Sunday, 1=Monday, etc.)

**Monthly:**
```json
{
  "frequency": "monthly",
  "dayOfMonth": 15
}
```
Generates on specific day of month (e.g., 15th of each month)

**Yearly:**
```json
{
  "frequency": "yearly"
}
```
Generates on same month/day as original due date

### 3. Instance Generation
- Checks if instance already exists for today (prevents duplicates)
- Creates new task with:
  - Same title, description, priority, category, tags
  - Status = 'todo' (reset from template)
  - New due date calculated from recurrence pattern
  - Assigned to same user
  - `parent_task_id` = template task ID
  - No recurrence pattern (instances don't recur)

### 4. Error Handling
- Logs all operations to Supabase Edge Function logs
- Continues processing even if one task fails
- Returns summary with success count and errors

## Deployment

### 1. Deploy Edge Function
```bash
cd supabase
supabase functions deploy generate-recurring-tasks
```

### 2. Setup Cron Schedule
In Supabase Dashboard → Edge Functions → Cron Jobs:

**Name:** Generate Recurring Tasks  
**Function:** generate-recurring-tasks  
**Schedule:** `0 0 * * *` (Daily at midnight UTC)  
**HTTP Method:** POST  
**Enabled:** Yes

Alternative via SQL:
```sql
-- Create pg_cron job (requires pg_cron extension)
SELECT cron.schedule(
  'generate-recurring-tasks',
  '0 0 * * *', -- Daily at midnight UTC
  $$
  SELECT extensions.http_post(
    url := 'https://your-project.supabase.co/functions/v1/generate-recurring-tasks',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### 3. Test Manually
```bash
# Get your function URL
supabase functions list

# Invoke manually
curl -X POST \
  https://your-project.supabase.co/functions/v1/generate-recurring-tasks \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{
  "success": true,
  "message": "Generated 5 recurring task instances",
  "generated": 5,
  "templates_processed": 12,
  "timestamp": "2026-01-06T00:00:00.000Z"
}
```

## Environment Variables
The function automatically accesses:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (full access)

These are auto-injected by Supabase into Edge Functions.

## Example Recurring Task Setup

### Create a Recurring Template Task
```sql
INSERT INTO tasks (
  title,
  description,
  priority,
  status,
  due_date,
  workspace_id,
  created_by,
  recurrence_pattern,
  recurrence_end_date
) VALUES (
  'Weekly Team Standup',
  'Review progress and blockers',
  'high',
  'active',
  '2026-01-06T10:00:00Z', -- First occurrence (Monday 10 AM)
  'your-workspace-id',
  'your-user-id',
  '{"frequency": "weekly", "daysOfWeek": [1, 3, 5]}', -- Mon, Wed, Fri
  '2026-12-31T23:59:59Z' -- Ends at year end
);
```

This will generate task instances every Monday, Wednesday, and Friday at 10 AM.

### View Generated Instances
```sql
SELECT 
  t.id,
  t.title,
  t.due_date,
  t.status,
  t.created_at,
  parent.title as template_title
FROM tasks t
LEFT JOIN tasks parent ON t.parent_task_id = parent.id
WHERE t.parent_task_id IS NOT NULL
ORDER BY t.created_at DESC;
```

## Monitoring

### View Logs
Supabase Dashboard → Edge Functions → generate-recurring-tasks → Logs

Look for:
- `Starting recurring task generation for YYYY-MM-DD`
- `Found N recurring task templates`
- `Scheduled generation for: [Task Title]`
- `Successfully generated N task instances`

### Check for Errors
```sql
-- If you add logging table
CREATE TABLE function_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success' or 'error'
  message TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query errors
SELECT * FROM function_logs 
WHERE function_name = 'generate-recurring-tasks' 
  AND status = 'error'
ORDER BY created_at DESC;
```

## Timezone Considerations

The function runs at **midnight UTC**. To adjust for your timezone:

**Option 1: Adjust cron schedule**
```
0 7 * * *  # 7 AM UTC = Midnight PST (UTC-7)
0 5 * * *  # 5 AM UTC = Midnight EST (UTC-5)
```

**Option 2: Use multiple schedules**
```
0 0 * * *  # Midnight UTC (for Europe)
0 8 * * *  # 8 AM UTC = Midnight PST
```

**Option 3: Store user timezone in workspace**
Modify function to use workspace timezone preferences.

## Performance

- **Execution Time:** ~100-500ms for 50 templates
- **Cost:** Free tier includes 500K Edge Function invocations/month
- **Daily runs:** 30 invocations/month (well within limits)
- **Database queries:** 1 SELECT + 1 INSERT per generated task

## Troubleshooting

**No tasks generated:**
- Check if recurring tasks have `status = 'active'`
- Verify `recurrence_pattern` is valid JSON
- Check if `recurrence_end_date` hasn't passed
- Ensure due date exists and matches today's pattern

**Duplicate tasks:**
- Function checks for existing instances created today
- If duplicates appear, check `created_at` timestamps
- May indicate function ran twice (check cron logs)

**Tasks not assigned:**
- Verify `assigned_to` field is set in template task
- Check if user still has access to workspace

**Wrong due time:**
- Due time is preserved from original template
- To change, update template's `due_date` time component

## Future Enhancements

1. **Smart Scheduling:** Skip weekends/holidays
2. **Timezone Support:** Use workspace timezone settings
3. **Notification:** Email summary of generated tasks
4. **Batch Processing:** Generate week ahead instead of daily
5. **Skip Logic:** Skip if previous instance not completed
6. **Subtasks:** Copy subtasks from template

## Related Files
- [database-schema.sql](../../../database-schema.sql) - Tasks table definition
- [app/src/lib/recurrence.ts](../../../app/src/lib/recurrence.ts) - Client-side recurrence helpers
- [app/src/app/api/tasks/route.ts](../../../app/src/app/api/tasks/route.ts) - Tasks API
