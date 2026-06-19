import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { assertWorkspaceManager, assertWorkspaceMember, getSupabaseAdmin } from '@/lib/render-jobs/service'

interface RouteContext {
  params: {
    id: string
  }
}

async function authorizeMemoryItem(id: string, userId: string, mode: 'read' | 'manage') {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: item, error } = await supabaseAdmin
    .from('brand_memory_items')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !item) {
    return { supabaseAdmin, item: null, error: error?.message || 'Memory item not found' }
  }

  if (mode === 'manage') {
    await assertWorkspaceManager(supabaseAdmin, item.workspace_id, userId)
  } else {
    await assertWorkspaceMember(supabaseAdmin, item.workspace_id, userId)
  }
  return { supabaseAdmin, item, error: null }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabaseAdmin, error } = await authorizeMemoryItem(params.id, user.id, 'manage')
    if (error) {
      return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 404 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}
    for (const key of ['type', 'title', 'content', 'summary', 'metadata', 'source', 'source_url', 'importance', 'status']) {
      if (key in body) updates[key] = body[key]
    }

    if (typeof updates.content === 'string' && updates.content.trim().length === 0) {
      return NextResponse.json({ error: 'content cannot be empty' }, { status: 400 })
    }

    const { data, error: updateErr } = await supabaseAdmin
      .from('brand_memory_items')
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single()

    if (updateErr || !data) {
      return NextResponse.json({ error: updateErr?.message || 'Could not update memory item' }, { status: 500 })
    }

    return NextResponse.json({ memory_item: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabaseAdmin, error } = await authorizeMemoryItem(params.id, user.id, 'manage')
    if (error) {
      return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 404 })
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('brand_memory_items')
      .update({ status: 'archived' })
      .eq('id', params.id)

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
