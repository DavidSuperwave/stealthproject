import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

async function getWorkspaceCampaignIds(userId: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const context = await ensureWorkspaceContext(supabaseAdmin, userId)
  const { data: campaigns, error } = await supabaseAdmin
    .from('content_campaigns')
    .select('id')
    .eq('workspace_id', context.workspaceId)

  if (error) throw new Error(error.message)

  return {
    supabaseAdmin,
    context,
    campaignIds: (campaigns ?? []).map((campaign) => campaign.id),
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const campaignFilter = req.nextUrl.searchParams.get('campaign_id')
    const { supabaseAdmin, campaignIds } = await getWorkspaceCampaignIds(user.id)

    if (campaignIds.length === 0) {
      return NextResponse.json({ scripts: [] })
    }

    let query = supabaseAdmin
      .from('content_scripts')
      .select('id, campaign_id, brand_id, title, hook, body, cta, full_script, duration_target_sec, caption_text, status, created_at, updated_at')
      .in('campaign_id', campaignIds)
      .order('updated_at', { ascending: false })

    if (campaignFilter) {
      query = query.eq('campaign_id', campaignFilter)
    }

    const { data: scripts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ scripts: scripts ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudieron cargar los guiones'
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
    const fullScript = String(body.full_script ?? body.content ?? '').trim()
    const title = String(body.title ?? '').trim() || 'Guion sin titulo'
    const campaignId = String(body.campaign_id ?? '').trim()

    if (!campaignId) {
      return NextResponse.json({ error: 'Selecciona una campana antes de guardar el guion' }, { status: 400 })
    }
    if (!fullScript) {
      return NextResponse.json({ error: 'El guion no puede estar vacio' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)
    const { data: campaign, error: campaignErr } = await supabaseAdmin
      .from('content_campaigns')
      .select('id, workspace_id, brand_id')
      .eq('id', campaignId)
      .single()

    if (campaignErr || !campaign) {
      return NextResponse.json({ error: 'No se encontro la campana seleccionada' }, { status: 404 })
    }
    if (campaign.workspace_id !== context.workspaceId || campaign.brand_id !== context.brandId) {
      return NextResponse.json({ error: 'La campana no pertenece a este espacio de trabajo' }, { status: 403 })
    }

    const { data: script, error } = await supabaseAdmin
      .from('content_scripts')
      .insert({
        campaign_id: campaign.id,
        brand_id: campaign.brand_id,
        title,
        hook: String(body.hook ?? '').trim() || null,
        body: String(body.body ?? fullScript).trim(),
        cta: String(body.cta ?? '').trim() || null,
        full_script: fullScript,
        duration_target_sec: Number.isFinite(Number(body.duration_target_sec)) ? Number(body.duration_target_sec) : 45,
        caption_text: String(body.notes ?? body.caption_text ?? '').trim() || null,
        status: body.status ?? 'draft',
      })
      .select('id, campaign_id, brand_id, title, hook, body, cta, full_script, duration_target_sec, caption_text, status, created_at, updated_at')
      .single()

    if (error || !script) {
      return NextResponse.json({ error: error?.message || 'No se pudo guardar el guion' }, { status: 500 })
    }

    return NextResponse.json({ script }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo guardar el guion'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
