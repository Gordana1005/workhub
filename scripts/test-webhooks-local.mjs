#!/usr/bin/env node

/**
 * Local Webhook Testing Script
 * Tests webhook functionality without deploying to Supabase
 */

import crypto from 'crypto'
import https from 'https'
import http from 'http'

// Test configuration
const TEST_CONFIG = {
  webhookUrl: 'https://webhook.site/YOUR_UNIQUE_URL', // Replace with your webhook.site URL
  webhookSecret: 'test-secret-key-123',
  workspaceId: 'test-workspace-id',
  testEvents: [
    {
      event: 'task.created',
      data: {
        id: 'task-001',
        title: 'Test Task',
        description: 'This is a test task',
        priority: 'high',
        status: 'todo',
        workspace_id: 'test-workspace-id',
        assigned_to: 'user-001',
        due_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    },
    {
      event: 'task.completed',
      data: {
        id: 'task-001',
        title: 'Test Task',
        status: 'completed',
        completed_at: new Date().toISOString()
      }
    },
    {
      event: 'project.created',
      data: {
        id: 'project-001',
        name: 'Test Project',
        description: 'A test project',
        workspace_id: 'test-workspace-id',
        created_at: new Date().toISOString()
      }
    }
  ]
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateHmacSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(JSON.stringify(payload))
  return hmac.digest('hex')
}

/**
 * Send webhook request
 */
async function sendWebhook(webhookUrl, payload, signature, event) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl)
    const protocol = url.protocol === 'https:' ? https : http
    
    const postData = JSON.stringify(payload)
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-ID': 'test-webhook-001',
        'User-Agent': 'WorkHub-Webhook/1.0'
      }
    }

    const startTime = Date.now()
    
    const req = protocol.request(options, (res) => {
      let responseBody = ''
      
      res.on('data', (chunk) => {
        responseBody += chunk
      })
      
      res.on('end', () => {
        const duration = Date.now() - startTime
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: responseBody,
          duration
        })
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error('Request timeout after 30 seconds'))
    })

    req.write(postData)
    req.end()
  })
}

/**
 * Test webhook delivery
 */
async function testWebhook(eventConfig) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing: ${eventConfig.event}`)
  console.log('='.repeat(60))

  const payload = {
    event: eventConfig.event,
    timestamp: new Date().toISOString(),
    workspace_id: TEST_CONFIG.workspaceId,
    data: eventConfig.data
  }

  const signature = generateHmacSignature(payload, TEST_CONFIG.webhookSecret)

  console.log('\n📦 Payload:')
  console.log(JSON.stringify(payload, null, 2))
  
  console.log('\n🔐 HMAC Signature:')
  console.log(signature)
  
  console.log('\n📡 Sending webhook to:', TEST_CONFIG.webhookUrl)
  
  try {
    const response = await sendWebhook(
      TEST_CONFIG.webhookUrl,
      payload,
      signature,
      eventConfig.event
    )

    console.log('\n✅ Webhook delivered successfully!')
    console.log(`Status: ${response.statusCode} ${response.statusMessage}`)
    console.log(`Duration: ${response.duration}ms`)
    
    if (response.body) {
      console.log('\nResponse body:')
      try {
        const jsonBody = JSON.parse(response.body)
        console.log(JSON.stringify(jsonBody, null, 2))
      } catch {
        console.log(response.body.substring(0, 500))
      }
    }

    return { success: true, response }
  } catch (error) {
    console.error('\n❌ Webhook delivery failed!')
    console.error('Error:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Verify HMAC signature (for receiver side testing)
 */
function verifySignature(payload, signature, secret) {
  const expectedSignature = generateHmacSignature(payload, secret)
  return signature === expectedSignature
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n🚀 WorkHub Webhook Local Testing')
  console.log('='.repeat(60))
  
  // Check if webhook URL is configured
  if (TEST_CONFIG.webhookUrl.includes('YOUR_UNIQUE_URL')) {
    console.log('\n⚠️  Configuration Required!')
    console.log('\nSteps to configure:')
    console.log('1. Go to https://webhook.site/')
    console.log('2. Copy your unique URL')
    console.log('3. Open test-webhooks-local.mjs')
    console.log('4. Replace YOUR_UNIQUE_URL in webhookUrl with your URL')
    console.log('5. Run: node test-webhooks-local.mjs')
    console.log('\nExample:')
    console.log('  webhookUrl: "https://webhook.site/abc123-def456"')
    return
  }

  const results = {
    total: TEST_CONFIG.testEvents.length,
    passed: 0,
    failed: 0
  }

  // Run all test events
  for (const eventConfig of TEST_CONFIG.testEvents) {
    const result = await testWebhook(eventConfig)
    
    if (result.success) {
      results.passed++
    } else {
      results.failed++
    }

    // Wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Summary
  console.log('\n\n' + '='.repeat(60))
  console.log('📊 Test Summary')
  console.log('='.repeat(60))
  console.log(`Total Tests: ${results.total}`)
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`)

  // Signature verification example
  console.log('\n\n' + '='.repeat(60))
  console.log('🔐 Signature Verification Example')
  console.log('='.repeat(60))
  
  const examplePayload = {
    event: 'task.created',
    timestamp: new Date().toISOString(),
    data: { id: 'test' }
  }
  
  const exampleSignature = generateHmacSignature(examplePayload, TEST_CONFIG.webhookSecret)
  
  console.log('\nNode.js verification code:')
  console.log('```javascript')
  console.log('const crypto = require("crypto")')
  console.log('const hmac = crypto.createHmac("sha256", webhookSecret)')
  console.log('hmac.update(JSON.stringify(payload))')
  console.log('const expectedSignature = hmac.digest("hex")')
  console.log('const isValid = receivedSignature === expectedSignature')
  console.log('```')
  
  console.log('\nPython verification code:')
  console.log('```python')
  console.log('import hmac')
  console.log('import hashlib')
  console.log('import json')
  console.log('')
  console.log('signature = hmac.new(')
  console.log('    webhook_secret.encode(),')
  console.log('    json.dumps(payload).encode(),')
  console.log('    hashlib.sha256')
  console.log(').hexdigest()')
  console.log('is_valid = signature == received_signature')
  console.log('```')

  console.log('\n\n✨ Testing complete!')
  console.log('\nNext steps:')
  console.log('1. Check webhook.site to see the received requests')
  console.log('2. Verify the X-Webhook-Signature header matches')
  console.log('3. Test with your own webhook receiver')
  console.log('4. Deploy to Supabase (see SUPABASE_DEPLOYMENT.md)')
}

// Run tests
runTests().catch(console.error)
