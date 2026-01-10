import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ATTACHMENTS_BUCKET = 'attachments'

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function signUrl(path: string) {
  const { data, error } = await supabaseAdmin.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 60 * 60)

  if (error) {
    return null
  }

  return data?.signedUrl || null
}

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const workspaceId =
    searchParams.get('workspace_id') ||
    searchParams.get('workspaceId') ||
    auth.workspaceId
  const taskId = searchParams.get('task_id') || searchParams.get('taskId')

  if (workspaceId !== auth.workspaceId) {
    return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403 })
  }

  try {
    let query = supabaseAdmin
      .from('file_attachments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (taskId) {
      query = query.eq('task_id', taskId)
    }

    const { data, error } = await query

    if (error) throw error

    const attachments = await Promise.all(
      (data || []).map(async (item) => ({
        ...item,
        url: await signUrl(item.storage_path)
      }))
    )

    return NextResponse.json({ attachments })
  } catch (error: any) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const workspaceId =
      (formData.get('workspace_id') || formData.get('workspaceId'))?.toString() ||
      auth.workspaceId
    const taskId = formData.get('task_id')?.toString() || null
    const projectId = formData.get('project_id')?.toString() || null
    const noteId = formData.get('note_id')?.toString() || null

    if (workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403 })
    }

    const safeName = sanitizeFileName(file.name || 'upload')
    const targetSegment = taskId || projectId || noteId || 'general'
    const objectPath = `${workspaceId}/${targetSegment}/${Date.now()}-${safeName}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(objectPath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload failed:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('file_attachments')
      .insert({
        workspace_id: auth.workspaceId,
        task_id: taskId,
        project_id: projectId,
        note_id: noteId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: uploadData?.path || objectPath,
        uploaded_by: auth.user.id
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Attachment metadata insert failed:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const signedUrl = await signUrl(inserted.storage_path)

    return NextResponse.json({
      attachment: {
        ...inserted,
        url: signedUrl
      }
    })
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json().catch(() => null)
    const { searchParams } = new URL(request.url)
    const id = body?.id || searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 })
    }

    const { data: attachment, error: fetchError } = await supabaseAdmin
      .from('file_attachments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    if (attachment.workspace_id !== auth.workspaceId) {
      return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('file_attachments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      console.error('Attachment delete failed:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (attachment.storage_path) {
      await supabaseAdmin.storage
        .from(ATTACHMENTS_BUCKET)
        .remove([attachment.storage_path])
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting attachment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
