# Webhook Testing Guide

## Overview
This guide explains how to test WorkHub webhooks using free online tools and local development servers.

---

## Testing Tools

### 1. **RequestBin (Recommended)**
Free webhook testing service that captures and displays webhook payloads.

**URL:** https://requestbin.com/

**Steps:**
1. Visit RequestBin and click "Create a Request Bin"
2. Copy the generated URL (e.g., `https://eo24y7qk2sxh8.x.pipedream.net/`)
3. Create a webhook in WorkHub with this URL
4. Trigger an event (create/update task)
5. View the captured request in RequestBin

### 2. **Webhook.site**
Another excellent free service for webhook testing.

**URL:** https://webhook.site/

**Steps:**
1. Visit Webhook.site - a unique URL is automatically generated
2. Copy the URL from the top of the page
3. Create webhook in WorkHub using this URL
4. Trigger events and view payloads in real-time

### 3. **Ngrok (Local Testing)**
Expose your local development server to the internet.

**Installation:**
```bash
# Windows (Chocolatey)
choco install ngrok

# Mac (Homebrew)
brew install ngrok

# Or download from https://ngrok.com/download
```

**Usage:**
```bash
# Start local webhook receiver
npm run dev  # Port 3000

# In another terminal, expose port 3000
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use https://abc123.ngrok.io/api/your-webhook-endpoint
```

---

## Webhook Payload Format

### Request Headers
```
POST /your-webhook-endpoint
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256-signature>
X-Webhook-Event: task.created
X-Webhook-ID: <webhook-uuid>
User-Agent: WorkHub-Webhooks/1.0
```

### Payload Structure
```json
{
  "event": "task.created",
  "timestamp": "2026-01-06T12:34:56.789Z",
  "data": {
    "id": "task-uuid",
    "title": "Complete project documentation",
    "description": "Write comprehensive docs",
    "priority": "high",
    "status": "todo",
    "due_date": "2026-01-10T17:00:00Z",
    "workspace_id": "workspace-uuid",
    "project_id": "project-uuid",
    "assigned_to": "user-uuid",
    "created_by": "user-uuid",
    "created_at": "2026-01-06T12:34:56Z"
  }
}
```

### Event Types

**task.created**
```json
{
  "event": "task.created",
  "data": { /* full task object */ }
}
```

**task.updated**
```json
{
  "event": "task.updated",
  "data": {
    "before": { /* previous task state */ },
    "after": { /* new task state */ }
  }
}
```

**task.completed**
```json
{
  "event": "task.completed",
  "data": {
    "before": { /* task with is_completed: false */ },
    "after": { /* task with is_completed: true */ }
  }
}
```

**task.deleted**
```json
{
  "event": "task.deleted",
  "data": { /* deleted task object */ }
}
```

---

## HMAC Signature Verification

### Node.js Example
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express middleware
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  console.log('Event:', req.headers['x-webhook-event']);
  console.log('Data:', req.body);
  
  res.sendStatus(200);
});
```

### Python Example
```python
import hmac
import hashlib
import json
from flask import Flask, request

app = Flask(__name__)

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    secret = os.getenv('WEBHOOK_SECRET')
    
    if not verify_signature(request.json, signature, secret):
        return 'Invalid signature', 401
    
    # Process webhook
    event = request.headers.get('X-Webhook-Event')
    data = request.json
    
    print(f'Event: {event}')
    print(f'Data: {data}')
    
    return 'OK', 200
```

### PHP Example
```php
<?php
function verifySignature($payload, $signature, $secret) {
    $expected = hash_hmac('sha256', json_encode($payload), $secret);
    return hash_equals($signature, $expected);
}

$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'];
$secret = getenv('WEBHOOK_SECRET');
$payload = json_decode(file_get_contents('php://input'), true);

if (!verifySignature($payload, $signature, $secret)) {
    http_response_code(401);
    exit('Invalid signature');
}

// Process webhook
$event = $_SERVER['HTTP_X_WEBHOOK_EVENT'];
error_log("Event: $event");
error_log("Data: " . json_encode($payload));

http_response_code(200);
?>
```

---

## Testing Scenarios

### 1. Task Creation Test
```bash
# In WorkHub:
1. Create webhook listening to "task.created"
2. Create a new task
3. Check RequestBin/Webhook.site for payload
4. Verify signature is present
5. Confirm task data is complete
```

### 2. Task Completion Test
```bash
# In WorkHub:
1. Create webhook listening to "task.completed"
2. Mark an existing task as complete
3. Verify payload shows before/after states
4. Confirm is_completed changed from false to true
```

### 3. Retry Logic Test
```bash
# Setup:
1. Create webhook with invalid URL (e.g., https://invalid-domain-12345.com)
2. Create a task
3. Check webhook_logs table for retry attempts

# SQL Query:
SELECT 
  id, 
  webhook_id, 
  event_type, 
  status_code, 
  error_message, 
  attempt_number, 
  next_retry_at, 
  success 
FROM webhook_logs 
WHERE webhook_id = 'your-webhook-id' 
ORDER BY created_at DESC;
```

### 4. Performance Test
```bash
# Bulk operations:
1. Create webhook
2. Bulk create 50 tasks via API
3. Verify all 50 webhooks delivered
4. Check average response time in webhook_stats view

# SQL Query:
SELECT * FROM webhook_stats WHERE id = 'your-webhook-id';
```

---

## Troubleshooting

### Issue: Webhook not triggering
**Checklist:**
- [ ] Webhook is active (`active = true`)
- [ ] Event type matches trigger (e.g., webhook listens to `task.created`)
- [ ] Workspace matches the entity's workspace
- [ ] Database trigger is enabled
- [ ] Edge Function is deployed

**Debug SQL:**
```sql
-- Check webhook configuration
SELECT * FROM webhooks WHERE id = 'webhook-id';

-- Check if trigger fired
SELECT * FROM webhook_logs WHERE webhook_id = 'webhook-id' ORDER BY created_at DESC LIMIT 10;

-- Check trigger existence
SELECT * FROM pg_trigger WHERE tgname = 'task_webhook_trigger';
```

### Issue: Signature verification fails
**Checklist:**
- [ ] Using the secret from webhook configuration (not regenerated)
- [ ] Payload serialization matches (no extra whitespace)
- [ ] Using HMAC-SHA256 algorithm
- [ ] Comparing signatures with timing-safe comparison

**Test Command:**
```bash
# Generate expected signature
echo -n '{"event":"task.created","timestamp":"2026-01-06T12:00:00Z","data":{}}' | \
  openssl dgst -sha256 -hmac "your-webhook-secret"
```

### Issue: Slow delivery
**Checklist:**
- [ ] Destination server responding within 30 seconds
- [ ] Network connectivity stable
- [ ] SSL certificate valid (if verify_ssl = true)

**Check logs:**
```sql
SELECT 
  webhook_id,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration,
  COUNT(*) as total_deliveries
FROM webhook_logs
WHERE success = true
GROUP BY webhook_id;
```

---

## Integration Examples

### Slack Integration
```javascript
// Slack incoming webhook format
app.post('/workhub-to-slack', (req, res) => {
  const { event, data } = req.body;
  
  const slackMessage = {
    text: `${event}: ${data.title}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${data.title}*\n${data.description || 'No description'}`
        }
      }
    ]
  };
  
  // Forward to Slack
  fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackMessage)
  });
  
  res.sendStatus(200);
});
```

### Discord Integration
```javascript
// Discord webhook format
app.post('/workhub-to-discord', (req, res) => {
  const { event, data } = req.body;
  
  const discordMessage = {
    username: 'WorkHub',
    content: `**${event}**`,
    embeds: [{
      title: data.title,
      description: data.description,
      color: 0x3b82f6, // Blue
      timestamp: new Date().toISOString()
    }]
  };
  
  fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discordMessage)
  });
  
  res.sendStatus(200);
});
```

### Email Notification
```javascript
// Using SendGrid/Mailgun
app.post('/workhub-to-email', async (req, res) => {
  const { event, data } = req.body;
  
  await sendEmail({
    to: 'team@company.com',
    subject: `WorkHub: ${event}`,
    html: `
      <h2>${event}</h2>
      <p><strong>Task:</strong> ${data.title}</p>
      <p><strong>Priority:</strong> ${data.priority}</p>
      <p><strong>Due:</strong> ${data.due_date}</p>
    `
  });
  
  res.sendStatus(200);
});
```

---

## Production Recommendations

1. **Use HTTPS only** - Enable verify_ssl for security
2. **Implement retry logic** - Handle temporary failures
3. **Rate limiting** - Prevent webhook flooding
4. **Idempotency** - Use webhook_id + event to deduplicate
5. **Monitoring** - Track success rates and response times
6. **Alerting** - Notify admins when failure rate exceeds threshold
7. **Payload validation** - Always verify signature before processing
8. **Timeouts** - Respond within 30 seconds to avoid retries
9. **Logging** - Keep webhook logs for debugging
10. **Graceful degradation** - Queue webhooks if endpoint is down

---

## Deployment Checklist

- [ ] Deploy `deliver-webhook` Edge Function
- [ ] Apply `database-webhooks.sql` schema
- [ ] Configure webhook settings in UI
- [ ] Test with RequestBin
- [ ] Verify HMAC signature
- [ ] Test retry logic
- [ ] Monitor webhook_logs table
- [ ] Setup alerting for high failure rates
- [ ] Document webhook URLs for team
- [ ] Backup webhook secrets securely

---

## Resources

- RequestBin: https://requestbin.com/
- Webhook.site: https://webhook.site/
- Ngrok: https://ngrok.com/
- HMAC Calculator: https://www.freeformatter.com/hmac-generator.html
- JSON Formatter: https://jsonformatter.org/

For more information, see [database-webhooks.sql](../database-webhooks.sql) and [supabase/functions/deliver-webhook/](../supabase/functions/deliver-webhook/).
