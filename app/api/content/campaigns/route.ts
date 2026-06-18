import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

function normalizePlatform(value: unknown) {
  const platform = String(value ?? 'video').trim().toLowerCase()
  return platform || 'video'
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
    const assetCounts = new Map<string, number>()

    if (campaignIds.length > 0) {
      const [{ data: scripts }, { data: assets }] = await Promise.all([
        supabaseAdmin.from('content_scripts').select('campaign_id').in('campaign_id', campaignIds),
        supabaseAdmin.from('video_assets').select('campaign_id').in('campaign_id', campaignIds),
      ])

      ;(scripts ?? []).forEach((script) => {
        scriptCounts.set(script.campaign_id, (scriptCounts.get(script.campaign_id) ?? 0) + 1)
      })
      ;(assets ?? []).forEach((asset) => {
        if (asset.campaign_id) {
          assetCounts.set(asset.campaign_id, (assetCounts.get(asset.campaign_id) ?? 0) + 1)
        }
      })
    }

    return NextResponse.json({
      campaigns: (campaigns ?? []).map((campaign) => ({
        ...campaign,
        script_count: scriptCounts.get(campaign.id) ?? 0,
        asset_count: assetCounts.get(campaign.id) ?? 0,
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
