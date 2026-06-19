import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

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

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)
    const { data: campaigns, error: campaignsErr } = await supabaseAdmin
      .from('content_campaigns')
      .select('id, name, objective, platform, status, brief, created_at, updated_at')
      .eq('workspace_id', context.workspaceId)
      .eq('brand_id', context.brandId)
      .order('updated_at', { ascending: false })

    if (campaignsErr) {
      return NextResponse.json({ error: campaignsErr.message }, { status: 500 })
    }

    const campaignIds = (campaigns ?? []).map((campaign) => campaign.id)
    const [scriptsResult, assetsResult, jobsResult] = await Promise.all([
      campaignIds.length > 0
        ? supabaseAdmin
            .from('content_scripts')
            .select('id, campaign_id, brand_id, title, full_script, duration_target_sec, status, caption_text, created_at, updated_at')
            .in('campaign_id', campaignIds)
            .order('updated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin
        .from('video_assets')
        .select('id, campaign_id, render_job_id, script_id, title, source_url, storage_path, public_url, duration_sec, content_type, file_size, status, metadata, created_at')
        .eq('workspace_id', context.workspaceId)
        .eq('brand_id', context.brandId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('render_jobs')
        .select('id, campaign_id, script_id, status, progress, input, output, credits_reserved, error_message, created_at, updated_at')
        .eq('workspace_id', context.workspaceId)
        .eq('brand_id', context.brandId)
        .order('updated_at', { ascending: false })
        .limit(50),
    ])

    if (scriptsResult.error) {
      return NextResponse.json({ error: scriptsResult.error.message }, { status: 500 })
    }
    if (assetsResult.error) {
      return NextResponse.json({ error: assetsResult.error.message }, { status: 500 })
    }
    if (jobsResult.error) {
      return NextResponse.json({ error: jobsResult.error.message }, { status: 500 })
    }

    const campaignNames = new Map((campaigns ?? []).map((campaign) => [campaign.id, campaign.name]))
    const scriptCounts = new Map<string, number>()
    const videoCounts = new Map<string, number>()
    const audioCounts = new Map<string, number>()
    const imageCounts = new Map<string, number>()
    const resultCounts = new Map<string, number>()

    ;(scriptsResult.data ?? []).forEach((script) => {
      if (script.campaign_id) {
        scriptCounts.set(script.campaign_id, (scriptCounts.get(script.campaign_id) ?? 0) + 1)
      }
    })

    const assets = (assetsResult.data ?? []).filter((asset) => !isPlaceholderMedia(asset))
    const safeAssets = assets.map((asset) => ({
      ...asset,
      public_url: asset.storage_path ? null : asset.public_url,
      source_url: asset.storage_path ? null : asset.source_url,
      download_url: `/api/assets/${asset.id}/download`,
    }))

    ;safeAssets.forEach((asset) => {
      if (!asset.campaign_id) return
      const type = getAssetType(asset)
      if (type === 'source_video') videoCounts.set(asset.campaign_id, (videoCounts.get(asset.campaign_id) ?? 0) + 1)
      if (type === 'audio' || type === 'voiceover') audioCounts.set(asset.campaign_id, (audioCounts.get(asset.campaign_id) ?? 0) + 1)
      if (type === 'image') imageCounts.set(asset.campaign_id, (imageCounts.get(asset.campaign_id) ?? 0) + 1)
      if (type === 'result_video') resultCounts.set(asset.campaign_id, (resultCounts.get(asset.campaign_id) ?? 0) + 1)
    })

    const campaignsWithCounts = (campaigns ?? []).map((campaign) => ({
      ...campaign,
      script_count: scriptCounts.get(campaign.id) ?? 0,
      video_count: videoCounts.get(campaign.id) ?? 0,
      audio_count: audioCounts.get(campaign.id) ?? 0,
      image_count: imageCounts.get(campaign.id) ?? 0,
      result_count: resultCounts.get(campaign.id) ?? 0,
      asset_count:
        (videoCounts.get(campaign.id) ?? 0) +
        (audioCounts.get(campaign.id) ?? 0) +
        (imageCounts.get(campaign.id) ?? 0) +
        (resultCounts.get(campaign.id) ?? 0),
    }))

    const items = [
      ...safeAssets.map((asset) => ({
        id: asset.id,
        type: getAssetType(asset),
        title: asset.title || 'Recurso sin nombre',
        campaign_id: asset.campaign_id,
        campaign_name: asset.campaign_id ? campaignNames.get(asset.campaign_id) ?? 'Campana' : null,
        created_at: asset.created_at,
        updated_at: asset.created_at,
        public_url: asset.storage_path ? null : asset.public_url,
        source_url: asset.storage_path ? null : asset.source_url,
        download_url: `/api/assets/${asset.id}/download`,
        file_size: asset.file_size,
        duration_sec: asset.duration_sec,
        status: asset.status,
        content_type: asset.content_type,
        metadata: asset.metadata ?? {},
        excerpt: null,
        full_script: null,
        render_job_id: asset.render_job_id,
        script_id: asset.script_id,
      })),
      ...(scriptsResult.data ?? []).map((script) => ({
        id: script.id,
        type: 'script',
        title: script.title || 'Guion sin titulo',
        campaign_id: script.campaign_id,
        campaign_name: script.campaign_id ? campaignNames.get(script.campaign_id) ?? 'Campana' : null,
        created_at: script.created_at,
        updated_at: script.updated_at,
        public_url: null,
        source_url: null,
        download_url: null,
        file_size: null,
        duration_sec: script.duration_target_sec,
        status: script.status,
        content_type: 'text/script',
        metadata: {},
        excerpt: scriptExcerpt(script),
        full_script: script.full_script,
        render_job_id: null,
        script_id: script.id,
      })),
    ].sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime())

    return NextResponse.json({
      campaigns: campaignsWithCounts,
      scripts: scriptsResult.data ?? [],
      assets: safeAssets,
      items,
      jobs: jobsResult.data ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo cargar la biblioteca'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
