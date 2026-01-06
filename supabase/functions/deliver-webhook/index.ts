// Supabase Edge Function: Deliver Webhook
// Delivers webhook payloads with HMAC signature and retry logic

// @ts-ignore: Deno runtime imports
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @ts-ignore: Deno runtime imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface WebhookDeliveryRequest {
  webhook_id: string
  event_type: string
  payload: Record<string, unknown>
  log_id?: string // If retrying, existing log ID
}

interface Webhook {
  id: string
  url: string
  secret: string
  verify_ssl: boolean
  active: boolean
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_RETRIES = 3
const RETRY_DELAYS = [60, 300, 900] // 1min, 5min, 15min in seconds

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    // @ts-ignore - Deno global
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-ignore - Deno global
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const body: WebhookDeliveryRequest = await req.json()
    const { webhook_id, event_type, payload, log_id } = body

    if (!webhook_id || !event_type || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Fetch webhook configuration
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhook_id)
      .single()

    if (webhookError || !webhook) {
      console.error('Webhook not found:', webhook_id)
      return new Response(
        JSON.stringify({ error: 'Webhook not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    if (!webhook.active) {
      console.log('Webhook is inactive, skipping delivery:', webhook_id)
      return new Response(
        JSON.stringify({ message: 'Webhook is inactive' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Prepare webhook payload
    const webhookPayload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      data: payload
    }

    // Generate HMAC signature
    const signature = await generateHmacSignature(
      JSON.stringify(webhookPayload),
      webhook.secret
    )

    // Deliver webhook
    const startTime = Date.now()
    let success = false
    let statusCode: number | null = null
    let responseBody = ''
    let errorMessage = ''

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event_type,
          'X-Webhook-ID': webhook_id,
          'User-Agent': 'WorkHub-Webhooks/1.0'
        },
        body: JSON.stringify(webhookPayload),
        // @ts-ignore - Deno specific
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      statusCode = response.status
      success = response.ok // 2xx status codes

      // Read response body (limit to 10KB)
      const text = await response.text()
      responseBody = text.substring(0, 10000)

      if (!success) {
        errorMessage = `HTTP ${statusCode}: ${responseBody}`
      }

    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Webhook delivery failed:', errorMessage)
    }

    const duration = Date.now() - startTime

    // Determine retry logic
    let nextRetryAt: string | null = null
    let attemptNumber = 1

    if (log_id) {
      // This is a retry, get previous attempt number
      const { data: existingLog } = await supabase
        .from('webhook_logs')
        .select('attempt_number')
        .eq('id', log_id)
        .single()

      attemptNumber = (existingLog?.attempt_number || 0) + 1
    }

    if (!success && attemptNumber < MAX_RETRIES) {
      const retryDelay = RETRY_DELAYS[attemptNumber - 1] || 900
      nextRetryAt = new Date(Date.now() + retryDelay * 1000).toISOString()
    }

    // Log delivery attempt
    const logData = {
      webhook_id,
      event_type,
      payload: webhookPayload,
      status_code: statusCode,
      response_body: responseBody,
      error_message: errorMessage || null,
      duration_ms: duration,
      attempt_number: attemptNumber,
      next_retry_at: nextRetryAt,
      success
    }

    if (log_id) {
      // Update existing log
      await supabase
        .from('webhook_logs')
        .update(logData)
        .eq('id', log_id)
    } else {
      // Create new log
      await supabase
        .from('webhook_logs')
        .insert(logData)
    }

    // Update webhook stats
    if (success) {
      await supabase
        .from('webhooks')
        .update({
          success_count: webhook.success_count + 1,
          last_triggered_at: new Date().toISOString()
        })
        .eq('id', webhook_id)
    } else {
      await supabase
        .from('webhooks')
        .update({
          failure_count: webhook.failure_count + 1,
          last_triggered_at: new Date().toISOString()
        })
        .eq('id', webhook_id)
    }

    // Schedule retry if needed
    if (nextRetryAt) {
      console.log(`Scheduling retry ${attemptNumber} for webhook ${webhook_id} at ${nextRetryAt}`)
      // Note: In production, use a proper queue system like pg_cron or external service
    }

    return new Response(
      JSON.stringify({
        success,
        webhook_id,
        event_type,
        status_code: statusCode,
        duration_ms: duration,
        attempt_number: attemptNumber,
        will_retry: nextRetryAt !== null,
        next_retry_at: nextRetryAt
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Fatal error in webhook delivery:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
async function generateHmacSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(payload)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageData
  )

  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
