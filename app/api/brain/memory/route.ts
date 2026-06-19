import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { assertWorkspaceManager, ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

const DEFAULT_MEMORY_TYPE = 'operator_note'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(
      supabaseAdmin,
      user.id,
      req.nextUrl.searchParams.get('workspace_id'),
      req.nextUrl.searchParams.get('brand_id'),
      { allowBootstrap: false },
    )

    const type = req.nextUrl.searchParams.get('type')
    const status = req.nextUrl.searchParams.get('status') ?? 'active'
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit') ?? 50), 1), 100)

    let query = supabaseAdmin
      .from('brand_memory_items')
      .select('*')
      .eq('workspace_id', context.workspaceId)
      .eq('brand_id', context.brandId)
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (type) query = query.eq('type', type)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ memory_items: data ?? [], context })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const content = String(body.content ?? '').trim()
    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(
      supabaseAdmin,
      user.id,
      body.workspace_id ?? null,
      body.brand_id ?? null,
      { allowBootstrap: false },
    )
    await assertWorkspaceManager(supabaseAdmin, context.workspaceId, user.id)

    const { data, error } = await supabaseAdmin
      .from('brand_memory_items')
      .insert({
        workspace_id: context.workspaceId,
        brand_id: context.brandId,
        type: body.type ?? DEFAULT_MEMORY_TYPE,
        title: body.title ?? null,
        content,
        summary: body.summary ?? null,
        metadata: body.metadata ?? {},
        source: body.source ?? 'manual',
        source_url: body.source_url ?? null,
        importance: Number(body.importance ?? 3),
        status: body.status ?? 'active',
        created_by: user.id,
      })
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Could not create memory item' }, { status: 500 })
    }

    return NextResponse.json({ memory_item: data, context }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
