import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { requireAuth } from '@/lib/auth-guard'
import { getRowWorkspaceId } from '@/lib/api-access'
import {
  ATTACHMENTS_BUCKET,
  MAX_ATTACHMENT_BYTES,
  buildStoragePath,
  cleanDisplayName,
  isMissingBucketError,
  isMissingSchemaError,
  isTaskStoragePath,
  validateAttachment,
} from '@/lib/attachments'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SIGNED_URL_TTL = 60 * 60

function notConfigured() {
  return NextResponse.json(
    { error: 'Attachments are not set up yet', code: 'not_configured' },
    { status: 503 }
  )
}

/** Signs many storage paths with one request. Returns path -> url (missing entries mean "could not sign"). */
async function signUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  if (!paths.length) return urls
  const { data, error } = await supabaseAdmin.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL)
  if (error || !data) return urls
  for (const item of data) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  }
  return urls
}

async function bucketExists(): Promise<boolean> {
  const { data, error } = await supabaseAdmin.storage.getBucket(ATTACHMENTS_BUCKET)
  return !error && !!data
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
      .limit(1000)

    if (taskId) {
      query = query.eq('task_id', taskId)
    }

    const [{ data, error }, hasBucket] = await Promise.all([query, bucketExists()])

    if (error) {
      if (isMissingSchemaError(error)) return NextResponse.json({ attachments: [], unavailable: 'table' })
      throw error
    }

    const rows = data || []
    if (!hasBucket) {
      return NextResponse.json({
        attachments: rows.map((item) => ({ ...item, url: null })),
        unavailable: 'bucket',
      })
    }

    const urls = await signUrls(rows.map((item) => item.storage_path))
    return NextResponse.json({
      attachments: rows.map((item) => ({ ...item, url: urls.get(item.storage_path) ?? null })),
    })
  } catch (error: any) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST (JSON), in two steps. Files go straight from the browser to storage through a signed upload
 * URL, so large files never pass through this route (serverless body limits).
 *   { action: 'sign', task_id, file_name, file_type, file_size }  -> { path, token, signedUrl }
 *   { action: 'register', task_id, path, file_name, file_type }   -> { attachment }
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const workspaceId = String(body.workspace_id || body.workspaceId || auth.workspaceId)
    if (workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403 })
    }

    const taskId = typeof body.task_id === 'string' ? body.task_id : ''
    if (!taskId) {
      return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
    }
    // The task must belong to the caller's workspace
    const taskWorkspaceId = await getRowWorkspaceId(supabaseAdmin, 'tasks', taskId)
    if (!taskWorkspaceId || taskWorkspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (body.action === 'sign') return await signUpload(auth.workspaceId, taskId, body)
    if (body.action === 'register') return await registerUpload(auth, taskId, body)
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function signUpload(workspaceId: string, taskId: string, body: any) {
  const file = {
    name: typeof body.file_name === 'string' ? body.file_name : '',
    size: Number(body.file_size),
    type: typeof body.file_type === 'string' ? body.file_type : '',
  }
  const problem = validateAttachment(file)
  if (problem) {
    const message =
      problem === 'tooLarge'
        ? `Files can be at most ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB`
        : problem === 'empty'
          ? 'The file is empty'
          : 'This file type is not supported'
    return NextResponse.json({ error: message, code: problem }, { status: problem === 'tooLarge' ? 413 : 400 })
  }

  // Fail early (before the browser sends megabytes) when the feature is not set up
  const [{ error: tableError }, hasBucket] = await Promise.all([
    supabaseAdmin.from('file_attachments').select('id').limit(1),
    bucketExists(),
  ])
  if ((tableError && isMissingSchemaError(tableError)) || !hasBucket) return notConfigured()

  const path = buildStoragePath(workspaceId, taskId, randomUUID(), file.name)
  const { data, error } = await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    if (isMissingBucketError(error)) return notConfigured()
    console.error('Signed upload URL failed:', error)
    return NextResponse.json({ error: error?.message || 'Could not prepare the upload' }, { status: 500 })
  }

  return NextResponse.json({ path: data.path, token: data.token, signedUrl: data.signedUrl })
}

async function registerUpload(auth: { user: { id: string }; workspaceId: string }, taskId: string, body: any) {
  const path = typeof body.path === 'string' ? body.path : ''
  if (!isTaskStoragePath(path, auth.workspaceId, taskId)) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  }

  const slash = path.lastIndexOf('/')
  const folder = path.slice(0, slash)
  const objectName = path.slice(slash + 1)

  // Trust the stored object, not the browser: look up its real size and content type
  const { data: listing, error: listError } = await supabaseAdmin.storage
    .from(ATTACHMENTS_BUCKET)
    .list(folder, { limit: 20, search: objectName })
  if (listError) {
    if (isMissingBucketError(listError)) return notConfigured()
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }
  const stored = (listing || []).find((item) => item.name === objectName)
  if (!stored) {
    return NextResponse.json({ error: 'The upload was not found. Please try again.' }, { status: 400 })
  }

  const meta = (stored.metadata || {}) as { size?: number; mimetype?: string }
  const size = Number(meta.size)
  const mimetype = meta.mimetype || (typeof body.file_type === 'string' ? body.file_type : '')
  const fileName = cleanDisplayName(typeof body.file_name === 'string' ? body.file_name : objectName)

  const problem = validateAttachment({ name: fileName, size, type: mimetype })
  if (problem) {
    await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).remove([path])
    return NextResponse.json({ error: 'This file can not be attached', code: problem }, { status: 400 })
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('file_attachments')
    .insert({
      workspace_id: auth.workspaceId,
      task_id: taskId,
      file_name: fileName,
      file_type: mimetype || null,
      file_size: size,
      storage_path: path,
      uploaded_by: auth.user.id,
    })
    .select('*')
    .single()

  if (insertError) {
    await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).remove([path])
    if (isMissingSchemaError(insertError)) return notConfigured()
    console.error('Attachment metadata insert failed:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const urls = await signUrls([inserted.storage_path])
  return NextResponse.json({
    attachment: { ...inserted, url: urls.get(inserted.storage_path) ?? null },
  })
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
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError && isMissingSchemaError(fetchError)) return notConfigured()
    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    if (attachment.workspace_id !== auth.workspaceId) {
      return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403 })
    }

    // Only the uploader or a workspace admin may delete an attachment
    if (attachment.uploaded_by !== auth.user.id && auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'Only the uploader or an admin can delete this attachment' }, { status: 403 })
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
