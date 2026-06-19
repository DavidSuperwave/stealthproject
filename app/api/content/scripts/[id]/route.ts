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
    const title = String(body.title ?? '').trim() || 'Guion sin titulo'
    const fullScript = String(body.full_script ?? '').trim()

    if (!fullScript) {
      return NextResponse.json({ error: 'El guion no puede estar vacio' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)

    const { data: script, error: scriptErr } = await supabaseAdmin
      .from('content_scripts')
      .select('id, workspace_id, campaign_id, brand_id')
      .eq('id', params.id)
      .single()

    if (scriptErr || !script) {
      return NextResponse.json({ error: 'No se encontro el guion' }, { status: 404 })
    }

    if (script.workspace_id !== context.workspaceId || script.brand_id !== context.brandId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { data: updated, error } = await supabaseAdmin
      .from('content_scripts')
      .update({
        title,
        full_script: fullScript,
        body: fullScript,
        status: body.status ?? 'draft',
      })
      .eq('id', params.id)
      .select('id, campaign_id, brand_id, title, hook, body, cta, full_script, duration_target_sec, caption_text, status, created_at, updated_at')
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: error?.message || 'No se pudo guardar el guion' }, { status: 500 })
    }

    return NextResponse.json({ script: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo guardar el guion'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
