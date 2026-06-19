import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ensureWorkspaceContext,
  getSupabaseAdmin,
  recordJobEvent,
  syncMockRenderJob,
  type RenderJobRow,
} from '@/lib/render-jobs/service'

function isMissingSchema(error?: { code?: string; message?: string } | null) {
  return (
    error?.code === 'PGRST205' ||
    error?.message?.includes("Could not find the table 'public.render_jobs'") ||
    error?.message?.includes("Could not find the table 'public.workspaces'")
  )
}

function mapJob(
  job: RenderJobRow,
  campaignNames: Map<string, string>,
  assetNames: Map<string, string> = new Map(),
) {
  const output = job.output ?? {}
  const input = job.input ?? {}
  const campaignName = job.campaign_id ? campaignNames.get(job.campaign_id) : null
  const videoAssetId = typeof input.master_video_asset_id === 'string'
    ? input.master_video_asset_id
    : typeof input.source_video_asset_id === 'string'
      ? input.source_video_asset_id
      : null
  const audioAssetId = typeof input.audio_asset_id === 'string' ? input.audio_asset_id : null
  const videoUrl = typeof output.video_url === 'string' && !output.video_url.includes('example.com/')
    ? output.video_url
    : null
  return {
    id: job.id,
    project_name: String(input.title ?? campaignName ?? 'Video Doble Labs'),
    campaign_name: campaignName,
    master_video_name: videoAssetId ? assetNames.get(videoAssetId) ?? null : null,
    audio_name: audioAssetId ? assetNames.get(audioAssetId) ?? null : null,
    is_mock: job.provider === 'mock',
    status: job.status,
    progress: job.progress,
    current_step: job.status,
    error: job.error_message,
    download_url: videoUrl,
    created_at: job.created_at,
    updated_at: job.updated_at,
  }
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit') ?? 10), 1), 50)
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('render_jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({ error: 'La configuracion de estado aun no esta lista.', setup_required: true }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const jobs: RenderJobRow[] = []
  for (const job of (data ?? []) as RenderJobRow[]) {
    jobs.push(await syncMockRenderJob(supabaseAdmin, job))
  }

  const campaignIds = Array.from(new Set(jobs.map((job) => job.campaign_id).filter(Boolean))) as string[]
  const assetIds = Array.from(new Set(jobs.flatMap((job) => {
    const input = job.input ?? {}
    return [
      typeof input.master_video_asset_id === 'string' ? input.master_video_asset_id : null,
      typeof input.source_video_asset_id === 'string' ? input.source_video_asset_id : null,
      typeof input.audio_asset_id === 'string' ? input.audio_asset_id : null,
    ].filter(Boolean)
  }))) as string[]
  const campaignNames = new Map<string, string>()
  const assetNames = new Map<string, string>()
  if (campaignIds.length > 0) {
    const { data: campaigns } = await supabaseAdmin
      .from('content_campaigns')
      .select('id, name')
      .in('id', campaignIds)
    ;(campaigns ?? []).forEach((campaign) => campaignNames.set(campaign.id, campaign.name))
  }
  if (assetIds.length > 0) {
    const { data: assets } = await supabaseAdmin
      .from('video_assets')
      .select('id, title')
      .in('id', assetIds)
    ;(assets ?? []).forEach((asset) => assetNames.set(asset.id, asset.title ?? 'Recurso'))
  }

  return NextResponse.json({ jobs: jobs.map((job) => mapJob(job, campaignNames, assetNames)) })
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)
    const now = new Date().toISOString()
    const { data: job, error } = await supabaseAdmin
      .from('render_jobs')
      .insert({
        workspace_id: context.workspaceId,
        brand_id: context.brandId,
        user_id: user.id,
        provider: 'mock',
        provider_model: 'video-generation-v1',
        provider_request_id: `test_req_${Date.now()}`,
        provider_job_id: `test_job_${Date.now()}`,
        status: 'in_progress',
        progress: 18,
        input: {
          title: 'Prueba de estado de video',
          mock_duration_ms: 45_000,
        },
        output: {},
        credits_reserved: 0,
        submitted_at: now,
        started_at: now,
      })
      .select('*')
      .single()

    if (error || !job) {
      if (isMissingSchema(error)) {
        return NextResponse.json({ error: 'La configuracion de estado aun no esta lista.', setup_required: true }, { status: 503 })
      }
      return NextResponse.json({ error: error?.message || 'No se pudo crear la prueba de estado' }, { status: 500 })
    }

    await recordJobEvent(supabaseAdmin, job.id, 'job_created', 'Prueba de estado creada.')

    return NextResponse.json({ job: mapJob(job as RenderJobRow, new Map()) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo crear la prueba de estado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
