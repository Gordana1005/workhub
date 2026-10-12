/**
 * Browser side of task attachments: validation, direct-to-storage upload with progress, listing.
 * Files go to storage through a signed upload URL (the API route only signs and registers), so size
 * is not limited by serverless request-body caps.
 */
import { validateAttachment, type AttachmentProblem } from './attachments'

export interface TaskAttachment {
  id: string
  task_id?: string | null
  file_name: string
  file_type?: string | null
  file_size?: number | null
  storage_path: string
  uploaded_by?: string | null
  created_at: string
  /** Signed URL (null when it could not be signed). */
  url: string | null
}

export type AttachmentErrorCode = AttachmentProblem | 'not_configured' | 'network' | 'failed'

export class AttachmentError extends Error {
  code: AttachmentErrorCode
  constructor(code: AttachmentErrorCode, message?: string) {
    super(message || code)
    this.name = 'AttachmentError'
    this.code = code
  }
}

/** Fired on `window` after a file was attached somewhere else (e.g. pasted into a comment). */
export const ATTACHMENTS_CHANGED_EVENT = 'trackwork:attachments-changed'

export function announceAttachmentsChanged(taskId: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ATTACHMENTS_CHANGED_EVENT, { detail: { taskId } }))
}

/** Signed URLs open the file inline; this variant makes the browser download it under its real name. */
export function downloadUrl(url: string, fileName: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(fileName)}`
}

function endpoint(workspaceId: string) {
  return `/api/attachments?workspace_id=${encodeURIComponent(workspaceId)}`
}

export interface AttachmentList {
  attachments: TaskAttachment[]
  /** 'table' / 'bucket' when the database table or the storage bucket does not exist yet. */
  unavailable: 'table' | 'bucket' | null
}

export async function loadTaskAttachments(workspaceId: string, taskId: string): Promise<AttachmentList> {
  const params = new URLSearchParams({ workspace_id: workspaceId, task_id: taskId })
  const response = await fetch(`/api/attachments?${params.toString()}`)
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new AttachmentError('failed', payload?.error)
  return { attachments: payload?.attachments || [], unavailable: payload?.unavailable || null }
}

export async function deleteTaskAttachment(workspaceId: string, id: string): Promise<void> {
  const response = await fetch(endpoint(workspaceId), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, workspace_id: workspaceId }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new AttachmentError(payload?.code === 'not_configured' ? 'not_configured' : 'failed', payload?.error)
  }
}

function putToStorage(signedUrl: string, file: File, onProgress?: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (anon) {
      xhr.setRequestHeader('apikey', anon)
      xhr.setRequestHeader('Authorization', `Bearer ${anon}`)
    }
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.min(1, event.loaded / event.total))
    }
    xhr.onerror = () => reject(new AttachmentError('network'))
    xhr.ontimeout = () => reject(new AttachmentError('network'))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1)
        resolve()
        return
      }
      let message: string | undefined
      try {
        message = JSON.parse(xhr.responseText)?.message
      } catch {
        // not JSON
      }
      if (/bucket not found/i.test(message || '')) reject(new AttachmentError('not_configured', message))
      else if (xhr.status === 413) reject(new AttachmentError('tooLarge', message))
      else reject(new AttachmentError('failed', message))
    }
    const form = new FormData()
    form.append('cacheControl', '3600')
    form.append('', file)
    xhr.send(form)
  })
}

/** Validates, uploads (with progress 0..1) and registers one file on a task. */
export async function uploadTaskAttachment(opts: {
  workspaceId: string
  taskId: string
  file: File
  onProgress?: (fraction: number) => void
}): Promise<TaskAttachment> {
  const { workspaceId, taskId, file, onProgress } = opts

  const problem = validateAttachment(file)
  if (problem) throw new AttachmentError(problem)

  const post = async (body: Record<string, unknown>) => {
    let response: Response
    try {
      response = await fetch(endpoint(workspaceId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, workspace_id: workspaceId, task_id: taskId }),
      })
    } catch {
      throw new AttachmentError('network')
    }
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const code = payload?.code as string | undefined
      if (response.status === 503 || code === 'not_configured') throw new AttachmentError('not_configured', payload?.error)
      if (code === 'tooLarge' || code === 'empty' || code === 'unsupported') throw new AttachmentError(code, payload?.error)
      throw new AttachmentError('failed', payload?.error)
    }
    return payload
  }

  const signed = await post({
    action: 'sign',
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
  })
  onProgress?.(0)
  await putToStorage(signed.signedUrl, file, onProgress)

  const registered = await post({
    action: 'register',
    path: signed.path,
    file_name: file.name,
    file_type: file.type,
  })
  return registered.attachment as TaskAttachment
}
