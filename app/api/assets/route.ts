import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

const allowedAssetTypes = new Set(['source_video', 'audio', 'voiceover', 'result_video'])

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const title = String(body.title ?? '').trim()
    const assetType = String(body.asset_type ?? '').trim()

    if (!title) {
      return NextResponse.json({ error: 'El nombre del archivo es obligatorio' }, { status: 400 })
    }
    if (!allowedAssetTypes.has(assetType)) {
      return NextResponse.json({ error: 'Tipo de recurso no valido' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)
    const campaignId = body.campaign_id ? String(body.campaign_id) : null
    const scriptId = body.script_id ? String(body.script_id) : null

    if (campaignId) {
      const { data: campaign, error: campaignErr } = await supabaseAdmin
        .from('content_campaigns')
        .select('id, workspace_id, brand_id')
        .eq('id', campaignId)
        .single()

      if (campaignErr || !campaign || campaign.workspace_id !== context.workspaceId || campaign.brand_id !== context.brandId) {
        return NextResponse.json({ error: 'La campana seleccionada no es valida' }, { status: 400 })
      }
    }

    const { data: asset, error } = await supabaseAdmin
      .from('video_assets')
      .insert({
        workspace_id: context.workspaceId,
        brand_id: context.brandId,
        campaign_id: campaignId,
        script_id: scriptId,
        title,
        source_url: String(body.source_url ?? ''),
        public_url: String(body.public_url ?? body.source_url ?? ''),
        duration_sec: Number.isFinite(Number(body.duration_sec)) ? Number(body.duration_sec) : null,
        content_type: String(body.content_type ?? '').trim() || null,
        file_size: Number.isFinite(Number(body.file_size)) ? Number(body.file_size) : null,
        provider: null,
        status: 'ready',
        metadata: {
          ...(typeof body.metadata === 'object' && body.metadata ? body.metadata : {}),
          asset_type: assetType,
          created_from: 'workspace_flow',
        },
      })
      .select('id, workspace_id, brand_id, campaign_id, render_job_id, script_id, title, source_url, public_url, duration_sec, content_type, file_size, status, metadata, created_at')
      .single()

    if (error || !asset) {
      return NextResponse.json({ error: error?.message || 'No se pudo guardar el recurso' }, { status: 500 })
    }

    return NextResponse.json({ asset }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo guardar el recurso'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
