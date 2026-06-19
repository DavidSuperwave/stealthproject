import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

function normalizePlatform(value: unknown) {
  const platform = String(value ?? 'video').trim().toLowerCase()
  return platform || 'video'
}

function getAssetType(asset: { metadata?: Record<string, unknown> | null; render_job_id?: string | null; content_type?: string | null }) {
  if (asset.metadata?.asset_type) return String(asset.metadata.asset_type)
  if (asset.render_job_id) return 'result_video'
  if (asset.content_type?.startsWith('audio/')) return 'audio'
  return 'source_video'
}

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)

    const { data: campaigns, error } = await supabaseAdmin
      .from('content_campaigns')
      .select('id, name, objective, platform, target_video_count, target_duration_sec, status, brief, created_at, updated_at')
      .eq('workspace_id', context.workspaceId)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const campaignIds = (campaigns ?? []).map((campaign) => campaign.id)
    const scriptCounts = new Map<string, number>()
    const videoCounts = new Map<string, number>()
    const audioCounts = new Map<string, number>()
    const resultCounts = new Map<string, number>()
    const jobCounts = new Map<string, number>()

    if (campaignIds.length > 0) {
      const [{ data: scripts }, { data: assets }, { data: jobs }] = await Promise.all([
        supabaseAdmin.from('content_scripts').select('campaign_id').in('campaign_id', campaignIds),
        supabaseAdmin.from('video_assets').select('campaign_id, render_job_id, content_type, metadata').in('campaign_id', campaignIds),
        supabaseAdmin.from('render_jobs').select('campaign_id').in('campaign_id', campaignIds),
      ])

      ;(scripts ?? []).forEach((script) => {
        scriptCounts.set(script.campaign_id, (scriptCounts.get(script.campaign_id) ?? 0) + 1)
      })
      ;(assets ?? []).forEach((asset) => {
        if (asset.campaign_id) {
          const type = getAssetType(asset)
          if (type === 'source_video') videoCounts.set(asset.campaign_id, (videoCounts.get(asset.campaign_id) ?? 0) + 1)
          if (['audio', 'voiceover'].includes(type)) audioCounts.set(asset.campaign_id, (audioCounts.get(asset.campaign_id) ?? 0) + 1)
          if (type === 'result_video') resultCounts.set(asset.campaign_id, (resultCounts.get(asset.campaign_id) ?? 0) + 1)
        }
      })
      ;(jobs ?? []).forEach((job) => {
        if (job.campaign_id) jobCounts.set(job.campaign_id, (jobCounts.get(job.campaign_id) ?? 0) + 1)
      })
    }

    return NextResponse.json({
      campaigns: (campaigns ?? []).map((campaign) => ({
        ...campaign,
        script_count: scriptCounts.get(campaign.id) ?? 0,
        video_count: videoCounts.get(campaign.id) ?? 0,
        audio_count: audioCounts.get(campaign.id) ?? 0,
        result_count: resultCounts.get(campaign.id) ?? 0,
        job_count: jobCounts.get(campaign.id) ?? 0,
        asset_count: (videoCounts.get(campaign.id) ?? 0) + (audioCounts.get(campaign.id) ?? 0) + (resultCounts.get(campaign.id) ?? 0),
      })),
      workspace_id: context.workspaceId,
      brand_id: context.brandId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudieron cargar las campanas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const name = String(body.name ?? '').trim()

    if (!name) {
      return NextResponse.json({ error: 'El nombre de la campana es obligatorio' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id, body.workspace_id ?? null, body.brand_id ?? null)
    const brief = {
      ...(typeof body.brief === 'object' && body.brief ? body.brief : {}),
      business: String(body.business ?? '').trim() || null,
      audience: String(body.audience ?? '').trim() || null,
      cta: String(body.cta ?? '').trim() || null,
      kind: body.kind === 'single' ? 'single_video' : 'campaign',
    }

    const { data: campaign, error } = await supabaseAdmin
      .from('content_campaigns')
      .insert({
        workspace_id: context.workspaceId,
        brand_id: context.brandId,
        name,
        objective: String(body.objective ?? '').trim() || null,
        platform: normalizePlatform(body.platform),
        target_video_count: Number.isFinite(Number(body.target_video_count)) ? Number(body.target_video_count) : null,
        target_duration_sec: Number.isFinite(Number(body.target_duration_sec)) ? Number(body.target_duration_sec) : 45,
        status: body.status ?? 'draft',
        brief,
        created_by: user.id,
      })
      .select('id, name, objective, platform, target_video_count, target_duration_sec, status, brief, created_at, updated_at')
      .single()

    if (error || !campaign) {
      return NextResponse.json({ error: error?.message || 'No se pudo crear la campana' }, { status: 500 })
    }

    return NextResponse.json({ campaign, workspace_id: context.workspaceId, brand_id: context.brandId }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo crear la campana'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
