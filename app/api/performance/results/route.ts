import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

function getAssetType(asset: { metadata?: Record<string, unknown> | null; render_job_id?: string | null; content_type?: string | null }) {
  if (asset.metadata?.asset_type) return String(asset.metadata.asset_type)
  if (asset.render_job_id) return 'result_video'
  if (asset.content_type?.startsWith('audio/')) return 'audio'
  return 'source_video'
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

    const { data: assets, error: assetsErr } = await supabaseAdmin
      .from('video_assets')
      .select('id, campaign_id, render_job_id, script_id, title, public_url, source_url, storage_path, duration_sec, status, metadata, created_at')
      .eq('workspace_id', context.workspaceId)
      .eq('brand_id', context.brandId)
      .order('created_at', { ascending: false })

    if (assetsErr) {
      return NextResponse.json({ error: assetsErr.message }, { status: 500 })
    }

    const resultAssets = (assets ?? [])
      .filter((asset) => getAssetType(asset) === 'result_video' && asset.campaign_id && !isPlaceholderMedia(asset))
      .map((asset) => ({
        ...asset,
        public_url: asset.storage_path ? null : asset.public_url,
        source_url: asset.storage_path ? null : asset.source_url,
        download_url: `/api/assets/${asset.id}/download`,
      }))
    const assetIds = resultAssets.map((asset) => asset.id)
    const campaignIds = Array.from(new Set(resultAssets.map((asset) => asset.campaign_id).filter(Boolean))) as string[]
    const scriptIds = Array.from(new Set(resultAssets.map((asset) => asset.script_id).filter(Boolean))) as string[]

    const [metricsResult, campaignsResult, scriptsResult] = await Promise.all([
      assetIds.length
        ? supabaseAdmin
            .from('performance_metrics')
            .select('id, campaign_id, video_asset_id, render_job_id, content_script_id, platform, platform_url, views, likes, comments, shares, saves, leads, conversions, notes, metadata, created_at')
            .in('video_asset_id', assetIds)
        : Promise.resolve({ data: [], error: null }),
      campaignIds.length
        ? supabaseAdmin
            .from('content_campaigns')
            .select('id, name')
            .in('id', campaignIds)
        : Promise.resolve({ data: [], error: null }),
      scriptIds.length
        ? supabaseAdmin
            .from('content_scripts')
            .select('id, title, full_script')
            .in('id', scriptIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (metricsResult.error) return NextResponse.json({ error: metricsResult.error.message }, { status: 500 })
    if (campaignsResult.error) return NextResponse.json({ error: campaignsResult.error.message }, { status: 500 })
    if (scriptsResult.error) return NextResponse.json({ error: scriptsResult.error.message }, { status: 500 })

    const metricsByAsset = new Map((metricsResult.data ?? []).map((metric) => [metric.video_asset_id, metric]))
    const campaignsById = new Map((campaignsResult.data ?? []).map((campaign) => [campaign.id, campaign.name]))
    const scriptsById = new Map((scriptsResult.data ?? []).map((script) => [script.id, script]))

    return NextResponse.json({
      results: resultAssets.map((asset) => {
        const metric = metricsByAsset.get(asset.id)
        const script = asset.script_id ? scriptsById.get(asset.script_id) : null
        return {
          asset,
          metric: metric ?? null,
          campaign_name: asset.campaign_id ? campaignsById.get(asset.campaign_id) ?? 'Campana' : 'Sin campana',
          script_title: script?.title ?? null,
          script_excerpt: script?.full_script ?? null,
          tracking_status: String(metric?.metadata?.tracking_status ?? 'pending'),
        }
      }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudieron cargar los resultados'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
