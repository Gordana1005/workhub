import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic'

// Admin client for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}
      }
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: comments, error } = await supabaseAdmin
      .from('task_notes')
      .select(`
        *,
        user:profiles!user_id(id, full_name)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(comments || [])
  } catch (error: any) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}
      }
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { task_id, content } = body

    const { data: comment, error } = await supabaseAdmin
      .from('task_notes')
      .insert({
        task_id,
        user_id: user.id,
        content
      })
      .select(`
        *,
        user:profiles!user_id(id, full_name)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(comment)
  } catch (error: any) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const commentId = searchParams.get('id')

  if (!commentId) {
    return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}
      }
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { error } = await supabaseAdmin
      .from('task_notes')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id) // Only allow users to delete their own comments

    if (error) throw error

    return NextResponse.json({ message: 'Comment deleted' })
  } catch (error: any) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
