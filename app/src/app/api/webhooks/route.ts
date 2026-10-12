import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Webhook targets must be http(s) and must not point at localhost / private networks (SSRF)
function isSafeWebhookUrl(raw: string): boolean {
  const u = new URL(raw)
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
  const host = u.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return false
  if (host === '::1' || host === '[::1]' || host.startsWith('[fc') || host.startsWith('[fd') || host.startsWith('[fe80')) return false
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    if (a === 0 || a === 10 || a === 127) return false
    if (a === 169 && b === 254) return false // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
  }
  return true
}

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const webhookId = searchParams.get('webhook_id')

  try {
    if (webhookId) {
      // Get single webhook
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('id', webhookId)
        .single()

      if (error) throw error

      return NextResponse.json({ webhook: data })
    } else if (workspaceId) {
      // List webhooks for workspace
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return NextResponse.json({ webhooks: data })
    } else {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { workspace_id, name, url, description, events, verify_ssl } = body

    // Validation
    if (!workspace_id || !name || !url || !events || events.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: workspace_id, name, url, events' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      if (!isSafeWebhookUrl(url)) throw new Error('unsafe url')
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Validate events
    const validEvents = [
      'task.created', 'task.updated', 'task.completed', 'task.deleted',
      'project.created', 'project.updated', 'project.deleted',
      'comment.created', 'time_entry.created'
    ]
    
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e))
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate secret for HMAC signature
    const { data: secretData } = await supabase.rpc('generate_webhook_secret')
    const secret = secretData || crypto.randomUUID().replace(/-/g, '')

    // Create webhook
    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        workspace_id,
        name,
        url,
        secret,
        description: description || null,
        events,
        verify_ssl: verify_ssl !== false, // Default to true
        created_by: user.id,
        active: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      webhook: data,
      message: 'Webhook created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating webhook:', error)
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { webhook_id, ...updates } = body

    if (!webhook_id) {
      return NextResponse.json(
        { error: 'webhook_id required' },
        { status: 400 }
      )
    }

    // Validate URL if provided
    if (updates.url) {
      try {
        if (!isSafeWebhookUrl(updates.url)) throw new Error('unsafe url')
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        )
      }
    }

    // Validate events if provided
    if (updates.events) {
      const validEvents = [
        'task.created', 'task.updated', 'task.completed', 'task.deleted',
        'project.created', 'project.updated', 'project.deleted',
        'comment.created', 'time_entry.created'
      ]
      
      const invalidEvents = updates.events.filter((e: string) => !validEvents.includes(e))
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Invalid events: ${invalidEvents.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Don't allow updating secret or created_by
    delete updates.secret
    delete updates.created_by
    delete updates.workspace_id
    delete updates.id

    // Update webhook
    const { data, error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', webhook_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      webhook: data,
      message: 'Webhook updated successfully' 
    })

  } catch (error) {
    console.error('Error updating webhook:', error)
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const webhookId = searchParams.get('webhook_id')

  if (!webhookId) {
    return NextResponse.json(
      { error: 'webhook_id required' },
      { status: 400 }
    )
  }

  try {
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId)

    if (error) throw error

    return NextResponse.json({ 
      message: 'Webhook deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting webhook:', error)
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    )
  }
}
