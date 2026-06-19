import { NextRequest, NextResponse } from 'next/server'
import { User } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code || 'api_error'
  }
}

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new ApiError(500, 'Supabase admin credentials are not configured', 'missing_supabase_admin')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function requireUser() {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new ApiError(401, 'Unauthorized', 'unauthorized')
  }

  return { user, supabase }
}

export async function assertProjectOwner(admin: ReturnType<typeof getSupabaseAdmin>, userId: string, projectId: string) {
  const { data: project, error } = await admin
    .from('projects')
    .select('id, user_id, workspace_id, name, status')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    throw new ApiError(404, 'Project not found', 'project_not_found')
  }

  if (project.user_id === userId) {
    return project
  }

  if (project.workspace_id) {
    const { data: membership } = await admin
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', project.workspace_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (membership) {
      return project
    }
  }

  throw new ApiError(403, 'Forbidden', 'forbidden')
}

export async function assertGenerationJobOwner(admin: ReturnType<typeof getSupabaseAdmin>, userId: string, jobId: string) {
  const { data: job, error } = await admin
    .from('generation_jobs')
    .select('id, user_id, project_id, status, credits_reserved, download_url')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    throw new ApiError(404, 'Generation job not found', 'generation_job_not_found')
  }

  if (job.user_id !== userId) {
    throw new ApiError(403, 'Forbidden', 'forbidden')
  }

  return job
}

export async function assertRenderJobOwner(admin: ReturnType<typeof getSupabaseAdmin>, userId: string, jobId: string) {
  const { data: job, error } = await admin
    .from('render_jobs')
    .select('id, user_id, project_id, status, credits_reserved, output_url')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    throw new ApiError(404, 'Render job not found', 'render_job_not_found')
  }

  if (job.user_id !== userId) {
    throw new ApiError(403, 'Forbidden', 'forbidden')
  }

  return job
}

export function assertStorageObjectOwner(storagePath: string | null | undefined, userId: string) {
  if (!storagePath || typeof storagePath !== 'string') {
    throw new ApiError(400, 'Storage path is required', 'storage_path_required')
  }

  const normalized = storagePath.replace(/^\/+/, '')
  const parts = normalized.split('/').filter(Boolean)

  if (parts.length < 2 || parts[0] !== userId || parts.some((part) => part === '..')) {
    throw new ApiError(403, 'Forbidden', 'forbidden')
  }

  return normalized
}

export function storagePathFromSupabaseUrl(value: string | null | undefined) {
  if (!value || typeof value !== 'string') return null

  try {
    const url = new URL(value)
    const marker = '/storage/v1/object/public/videos/'
    const privateMarker = '/storage/v1/object/sign/videos/'
    const pathname = decodeURIComponent(url.pathname)

    if (pathname.includes(marker)) {
      return pathname.split(marker)[1] || null
    }

    if (pathname.includes(privateMarker)) {
      return pathname.split(privateMarker)[1]?.split('?')[0] || null
    }
  } catch {
    return null
  }

  return null
}

export function assertTrustedUploadTarget(value: string | null | undefined) {
  if (!value || typeof value !== 'string') {
    throw new ApiError(400, 'Upload target is required', 'upload_target_required')
  }

  const url = new URL(value)

  if (url.protocol !== 'https:') {
    throw new ApiError(400, 'Upload target must use HTTPS', 'invalid_upload_target')
  }

  const hostname = url.hostname.toLowerCase()
  const trusted = hostname.endsWith('googleapis.com') || hostname.endsWith('storage.googleapis.com')

  if (!trusted) {
    throw new ApiError(400, 'Upload target is not trusted', 'invalid_upload_target')
  }

  return url
}

export function apiErrorResponse(error: unknown, fallback = 'Request failed') {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    )
  }

  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

export function getIdempotencyKey(request: NextRequest, bodyKey?: string | null) {
  return request.headers.get('Idempotency-Key') || bodyKey || null
}

export type AuthenticatedUser = User
