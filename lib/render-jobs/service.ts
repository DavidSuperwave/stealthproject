import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface WorkspaceContext {
  workspaceId: string
  brandId: string
}

export interface RenderJobRow {
  id: string
  workspace_id: string | null
  brand_id: string | null
  campaign_id: string | null
  script_id: string | null
  project_id: string | null
  user_id: string | null
  provider: string
  provider_model: string
  provider_request_id: string | null
  provider_job_id: string | null
  status: string
  progress: number
  input: Record<string, unknown>
  output: Record<string, unknown>
  estimated_cost_usd: number | null
  actual_cost_usd: number | null
  credits_reserved: number | null
  credits_captured: number | null
  error_code: string | null
  error_message: string | null
  submitted_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

function isUsableVideoUrl(value: unknown) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.includes('example.com/')) return false
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

interface WorkspaceContextOptions {
  allowBootstrap?: boolean
}

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function ensureWorkspaceContext(
  supabaseAdmin: SupabaseClient,
  userId: string,
  workspaceId?: string | null,
  brandId?: string | null,
  options: WorkspaceContextOptions = {},
): Promise<WorkspaceContext> {
  const allowBootstrap = options.allowBootstrap ?? true

  if (brandId) {
    const { data: brand, error: brandErr } = await supabaseAdmin
      .from('brands')
      .select('id, workspace_id')
      .eq('id', brandId)
      .single()

    if (brandErr || !brand) {
      throw new Error('Brand not found')
    }

    if (workspaceId && brand.workspace_id !== workspaceId) {
      throw new Error('Brand does not belong to the requested workspace')
    }

    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', brand.workspace_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!membership) {
      throw new Error('User is not a member of the requested brand workspace')
    }

    return { workspaceId: brand.workspace_id, brandId: brand.id }
  }

  if (workspaceId) {
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!membership) {
      throw new Error('User is not a member of the requested workspace')
    }
  }

  if (workspaceId && brandId) {
    return { workspaceId, brandId }
  }

  const { data: existingMembership } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  const existingWorkspaceId = workspaceId || existingMembership?.workspace_id

  if (existingWorkspaceId) {
    const { data: existingBrand } = await supabaseAdmin
      .from('brands')
      .select('id')
      .eq('workspace_id', existingWorkspaceId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (existingBrand?.id) {
      return { workspaceId: existingWorkspaceId, brandId: brandId || existingBrand.id }
    }

    if (!allowBootstrap) {
      throw new Error('Brand not found')
    }

    const { data: createdBrand, error: brandErr } = await supabaseAdmin
      .from('brands')
      .insert({
        workspace_id: existingWorkspaceId,
        name: 'Default brand',
        created_by: userId,
      })
      .select('id')
      .single()

    if (brandErr || !createdBrand) {
      throw new Error(brandErr?.message || 'Could not create default brand')
    }

    return { workspaceId: existingWorkspaceId, brandId: createdBrand.id }
  }

  if (!allowBootstrap) {
    throw new Error('Workspace context not found')
  }

  const { data: workspace, error: workspaceErr } = await supabaseAdmin
    .from('workspaces')
    .insert({
      name: 'Doble Labs Workspace',
      owner_id: userId,
      mode: 'self_serve',
    })
    .select('id')
    .single()

  if (workspaceErr || !workspace) {
    throw new Error(workspaceErr?.message || 'Could not create default workspace')
  }

  const { error: memberErr } = await supabaseAdmin
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: 'owner',
    })

  if (memberErr) {
    throw new Error(memberErr.message)
  }

  const { data: brand, error: brandErr } = await supabaseAdmin
    .from('brands')
    .insert({
      workspace_id: workspace.id,
      name: 'Default brand',
      created_by: userId,
    })
    .select('id')
    .single()

  if (brandErr || !brand) {
    throw new Error(brandErr?.message || 'Could not create default brand')
  }

  return { workspaceId: workspace.id, brandId: brand.id }
}

export async function recordJobEvent(
  supabaseAdmin: SupabaseClient,
  jobId: string,
  eventType: string,
  message?: string,
  payload: Record<string, unknown> = {},
) {
  await supabaseAdmin.from('job_events').insert({
    job_id: jobId,
    event_type: eventType,
    message: message ?? null,
    payload,
  })
}

export async function assertWorkspaceMember(
  supabaseAdmin: SupabaseClient,
  workspaceId: string,
  userId: string,
) {
  const { data: membership } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) {
    throw new Error('Forbidden')
  }
}

export async function assertWorkspaceManager(
  supabaseAdmin: SupabaseClient,
  workspaceId: string,
  userId: string,
) {
  const { data: membership } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .in('role', ['owner', 'admin', 'operator'])
    .maybeSingle()

  if (!membership) {
    throw new Error('Forbidden')
  }
}

export async function logUsageEvent(
  supabaseAdmin: SupabaseClient,
  params: {
    workspaceId?: string | null
    brandId?: string | null
    campaignId?: string | null
    userId?: string | null
    renderJobId?: string | null
    eventType: string
    provider?: string | null
    model?: string | null
    credits?: number | null
    estimatedCostUsd?: number | null
    actualCostUsd?: number | null
    metadata?: Record<string, unknown>
  },
) {
  await supabaseAdmin.from('usage_events').insert({
    workspace_id: params.workspaceId ?? null,
    brand_id: params.brandId ?? null,
    campaign_id: params.campaignId ?? null,
    user_id: params.userId ?? null,
    render_job_id: params.renderJobId ?? null,
    event_type: params.eventType,
    provider: params.provider ?? null,
    model: params.model ?? null,
    credits: params.credits ?? null,
    estimated_cost_usd: params.estimatedCostUsd ?? null,
    actual_cost_usd: params.actualCostUsd ?? null,
    metadata: params.metadata ?? {},
  })
}

export async function syncMockRenderJob(supabaseAdmin: SupabaseClient, job: RenderJobRow): Promise<RenderJobRow> {
  if (job.provider !== 'mock' || !['submitted', 'in_progress'].includes(job.status)) return job

  const started = new Date(job.started_at || job.submitted_at || job.created_at).getTime()
  const elapsedMs = Date.now() - started
  const durationMs = Number(job.input?.mock_duration_ms ?? 90_000)
  const fraction = Math.min(Math.max(elapsedMs / durationMs, 0), 1)
  const progress = Math.max(job.progress, Math.round(18 + fraction * 82))

  if (fraction < 1) {
    if (progress > job.progress) {
      await supabaseAdmin
        .from('render_jobs')
        .update({ status: 'in_progress', progress })
        .eq('id', job.id)
    }
    return { ...job, status: 'in_progress', progress }
  }

  const output: Record<string, unknown> = {
    ...(job.output ?? {}),
    preview_available: isUsableVideoUrl(job.output?.video_url),
    completed_by: 'mock_provider',
  }

  await supabaseAdmin
    .from('render_jobs')
    .update({
      status: 'completed',
      progress: 100,
      output,
      actual_cost_usd: job.actual_cost_usd ?? job.estimated_cost_usd ?? 0,
      credits_captured: job.credits_captured ?? job.credits_reserved ?? 0,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id)

  await recordJobEvent(supabaseAdmin, job.id, 'provider_completed', 'Mock render completed.', output)

  let assetId: string | null = null
  const videoUrl = isUsableVideoUrl(output.video_url) ? String(output.video_url) : null
  if (videoUrl) {
    const { data: asset } = await supabaseAdmin
      .from('video_assets')
      .insert({
        workspace_id: job.workspace_id,
        brand_id: job.brand_id,
        campaign_id: job.campaign_id,
        render_job_id: job.id,
        script_id: job.script_id,
        title: 'Video generado',
        source_url: videoUrl,
        public_url: videoUrl,
        provider: job.provider,
        status: 'ready',
        metadata: {
          asset_type: 'result_video',
          provider_model: job.provider_model,
          created_from: 'render_job',
        },
      })
      .select('id')
      .single()
    assetId = asset?.id ?? null
  }

  await logUsageEvent(supabaseAdmin, {
    workspaceId: job.workspace_id,
    brandId: job.brand_id,
    campaignId: job.campaign_id,
    userId: job.user_id,
    renderJobId: job.id,
    eventType: 'video_render_completed',
    provider: job.provider,
    model: job.provider_model,
    credits: Number(job.credits_reserved ?? 0),
    estimatedCostUsd: Number(job.estimated_cost_usd ?? 0),
    actualCostUsd: Number(job.actual_cost_usd ?? job.estimated_cost_usd ?? 0),
    metadata: { asset_id: assetId, preview_available: Boolean(videoUrl) },
  })

  return {
    ...job,
    status: 'completed',
    progress: 100,
    output,
    completed_at: new Date().toISOString(),
  }
}
