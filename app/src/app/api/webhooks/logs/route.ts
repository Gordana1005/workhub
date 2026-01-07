import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

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
  const webhookId = searchParams.get('webhook_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const successOnly = searchParams.get('success_only') === 'true'

  if (!webhookId) {
    return NextResponse.json(
      { error: 'webhook_id required' },
      { status: 400 }
    )
  }

  try {
    let query = supabase
      .from('webhook_logs')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (successOnly) {
      query = query.eq('success', true)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ logs: data })

  } catch (error) {
    console.error('Error fetching webhook logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook logs' },
      { status: 500 }
    )
  }
}
