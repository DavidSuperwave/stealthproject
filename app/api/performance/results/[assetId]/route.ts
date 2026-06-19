import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

interface RouteContext {
  params: {
    assetId: string
  }
}

const numericFields = ['views', 'likes', 'comments', 'shares', 'saves', 'leads', 'conversions'] as const

function numberOrZero(value: unknown) {
  return Math.max(0, Number(value) || 0)
}

async function getAuthorizedAsset(assetId: string, userId: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const context = await ensureWorkspaceContext(supabaseAdmin, userId)
  const { data: asset, error } = await supabaseAdmin
    .from('video_assets')
    .select('id, workspace_id, brand_id, campaign_id, render_job_id, script_id, metadata')
    .eq('id', assetId)
    .single()

  if (error || !asset) {
    return { supabaseAdmin, context, asset: null, error: 'No se encontro el resultado' }
  }

  if (asset.workspace_id !== context.workspaceId || asset.brand_id !== context.brandId) {
    return { supabaseAdmin, context, asset: null, error: 'No autorizado' }
  }

  if (String(asset.metadata?.asset_type ?? '') !== 'result_video') {
    return { supabaseAdmin, context, asset: null, error: 'El recurso no es un resultado generado' }
  }

  return { supabaseAdmin, context, asset, error: null }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { supabaseAdmin, context, asset, error } = await getAuthorizedAsset(params.assetId, user.id)
    if (error || !asset) {
      return NextResponse.json({ error }, { status: error === 'No autorizado' ? 403 : 404 })
    }

    const body = await req.json()
    const trackingStatus = ['pending', 'winner', 'discarded'].includes(String(body.tracking_status))
      ? String(body.tracking_status)
      : 'pending'

    const payload: Record<string, unknown> = {
      workspace_id: context.workspaceId,
      brand_id: context.brandId,
      campaign_id: asset.campaign_id,
      video_asset_id: asset.id,
      render_job_id: asset.render_job_id,
      content_script_id: asset.script_id,
      platform: String(body.platform ?? 'manual').trim() || 'manual',
      platform_url: String(body.platform_url ?? '').trim() || null,
      notes: String(body.notes ?? '').trim() || null,
      metadata: { tracking_status: trackingStatus },
    }

    numericFields.forEach((field) => {
      payload[field] = numberOrZero(body[field])
    })

    const { data: existing } = await supabaseAdmin
      .from('performance_metrics')
      .select('id')
      .eq('video_asset_id', asset.id)
      .maybeSingle()

    const query = existing?.id
      ? supabaseAdmin.from('performance_metrics').update(payload).eq('id', existing.id)
      : supabaseAdmin.from('performance_metrics').insert(payload)

    const { data: metric, error: metricErr } = await query
      .select('id, campaign_id, video_asset_id, render_job_id, content_script_id, platform, platform_url, views, likes, comments, shares, saves, leads, conversions, notes, metadata, created_at')
      .single()

    if (metricErr || !metric) {
      return NextResponse.json({ error: metricErr?.message || 'No se pudo guardar el resultado' }, { status: 500 })
    }

    return NextResponse.json({ metric })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo guardar el resultado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { supabaseAdmin, asset, error } = await getAuthorizedAsset(params.assetId, user.id)
    if (error || !asset) {
      return NextResponse.json({ error }, { status: error === 'No autorizado' ? 403 : 404 })
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('performance_metrics')
      .delete()
      .eq('video_asset_id', asset.id)

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo eliminar el seguimiento'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
