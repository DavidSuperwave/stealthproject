import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

interface RouteContext {
  params: {
    id: string
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const title = String(body.title ?? '').trim()

    if (!title) {
      return NextResponse.json({ error: 'El nombre del recurso es obligatorio' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)

    const { data: asset, error: assetErr } = await supabaseAdmin
      .from('video_assets')
      .select('id, workspace_id, brand_id')
      .eq('id', params.id)
      .single()

    if (assetErr || !asset) {
      return NextResponse.json({ error: 'No se encontro el recurso' }, { status: 404 })
    }

    if (asset.workspace_id !== context.workspaceId || asset.brand_id !== context.brandId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { data: updated, error } = await supabaseAdmin
      .from('video_assets')
      .update({ title })
      .eq('id', params.id)
      .select('id, workspace_id, brand_id, campaign_id, render_job_id, script_id, title, source_url, public_url, duration_sec, content_type, file_size, status, metadata, created_at')
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: error?.message || 'No se pudo renombrar el recurso' }, { status: 500 })
    }

    return NextResponse.json({ asset: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo renombrar el recurso'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
