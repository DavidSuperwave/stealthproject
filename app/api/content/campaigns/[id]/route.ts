import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

interface RouteContext {
  params: {
    id: string
  }
}

function getAssetType(asset: { metadata?: Record<string, unknown> | null; render_job_id?: string | null; content_type?: string | null }) {
  if (asset.metadata?.asset_type) return String(asset.metadata.asset_type)
  if (asset.render_job_id) return 'result_video'
  if (asset.content_type?.startsWith('audio/')) return 'audio'
  if (asset.content_type?.startsWith('image/')) return 'image'
  return 'source_video'
}

function scriptExcerpt(script: { full_script?: string | null }) {
  return String(script.full_script ?? '').replace(/\s+/g, ' ').trim().slice(0, 180)
}

function isPlaceholderMedia(asset: { public_url?: string | null; source_url?: string | null }) {
  return [asset.public_url, asset.source_url].some((url) => typeof url === 'string' && url.includes('example.com/'))
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)

    const { data: campaign, error: campaignErr } = await supabaseAdmin
      .from('content_campaigns')
      .select('id, workspace_id, brand_id, name, objective, platform, target_video_count, target_duration_sec, status, brief, created_at, updated_at')
      .eq('id', params.id)
      .single()

    if (campaignErr || !campaign) {
      return NextResponse.json({ error: 'No se encontro la campana' }, { status: 404 })
    }

    if (campaign.workspace_id !== context.workspaceId || campaign.brand_id !== context.brandId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const [scriptsResult, assetsResult, jobsResult, metricsResult] = await Promise.all([
      supabaseAdmin
        .from('content_scripts')
        .select('id, campaign_id, title, full_script, duration_target_sec, status, created_at, updated_at')
        .eq('campaign_id', campaign.id)
        .order('updated_at', { ascending: false }),
      supabaseAdmin
        .from('video_assets')
        .select('id, campaign_id, render_job_id, script_id, title, source_url, storage_path, public_url, duration_sec, content_type, file_size, status, metadata, created_at')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('render_jobs')
        .select('id, campaign_id, script_id, status, progress, input, output, credits_reserved, error_message, created_at, updated_at')
        .eq('campaign_id', campaign.id)
        .order('updated_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('performance_metrics')
        .select('id, campaign_id, video_asset_id, render_job_id, platform, views, likes, comments, shares, saves, leads, conversions, notes, metadata, created_at')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: false }),
    ])

    if (scriptsResult.error) return NextResponse.json({ error: scriptsResult.error.message }, { status: 500 })
    if (assetsResult.error) return NextResponse.json({ error: assetsResult.error.message }, { status: 500 })
    if (jobsResult.error) return NextResponse.json({ error: jobsResult.error.message }, { status: 500 })
    if (metricsResult.error) return NextResponse.json({ error: metricsResult.error.message }, { status: 500 })

    const assets = (assetsResult.data ?? []).filter((asset) => !isPlaceholderMedia(asset))
    const safeAssets = assets.map((asset) => ({
      ...asset,
      public_url: asset.storage_path ? null : asset.public_url,
      source_url: asset.storage_path ? null : asset.source_url,
      download_url: `/api/assets/${asset.id}/download`,
    }))
    const scripts = scriptsResult.data ?? []
    const jobs = jobsResult.data ?? []
    const groupedAssets = {
      videos: safeAssets.filter((asset) => getAssetType(asset) === 'source_video'),
      audio: safeAssets.filter((asset) => ['audio', 'voiceover'].includes(getAssetType(asset))),
      results: safeAssets.filter((asset) => getAssetType(asset) === 'result_video'),
    }
    const items = [
      ...safeAssets.map((asset) => ({
        id: asset.id,
        type: getAssetType(asset),
        title: asset.title || 'Recurso sin nombre',
        campaign_id: asset.campaign_id,
        created_at: asset.created_at,
        updated_at: asset.created_at,
        public_url: asset.public_url,
        source_url: asset.source_url,
        download_url: asset.download_url,
        file_size: asset.file_size,
        duration_sec: asset.duration_sec,
        status: asset.status,
        content_type: asset.content_type,
        excerpt: null,
        full_script: null,
        render_job_id: asset.render_job_id,
        script_id: asset.script_id,
      })),
      ...scripts.map((script) => ({
        id: script.id,
        type: 'script',
        title: script.title || 'Guion sin titulo',
        campaign_id: script.campaign_id,
        created_at: script.created_at,
        updated_at: script.updated_at,
        public_url: null,
        source_url: null,
        download_url: null,
        file_size: null,
        duration_sec: script.duration_target_sec,
        status: script.status,
        content_type: 'text/script',
        excerpt: scriptExcerpt(script),
        full_script: script.full_script,
        render_job_id: null,
        script_id: script.id,
      })),
    ].sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())
    const active_jobs = jobs.filter((job) => ['queued', 'submitted', 'in_progress'].includes(job.status))

    return NextResponse.json({
      campaign,
      scripts,
      assets: safeAssets,
      grouped_assets: groupedAssets,
      items,
      jobs,
      active_jobs,
      metrics: metricsResult.data ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo cargar la campana'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
