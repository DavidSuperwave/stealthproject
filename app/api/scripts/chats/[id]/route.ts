import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

interface RouteContext {
  params: {
    id: string
  }
}

async function getOwnedSession(sessionId: string, userId: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const context = await ensureWorkspaceContext(supabaseAdmin, userId)
  const { data: session, error } = await supabaseAdmin
    .from('script_chat_sessions')
    .select('id, workspace_id, brand_id, user_id, title, status, created_at, updated_at')
    .eq('id', sessionId)
    .eq('workspace_id', context.workspaceId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return { supabaseAdmin, context, session }
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { supabaseAdmin, session } = await getOwnedSession(params.id, user.id)
    if (!session) {
      return NextResponse.json({ error: 'No se encontro el chat' }, { status: 404 })
    }

    const { data: messages, error } = await supabaseAdmin
      .from('script_chat_messages')
      .select('id, role, content, attachments, model, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session, messages: messages ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo cargar el chat'
    return NextResponse.json({ error: message }, { status: 500 })
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
    const { supabaseAdmin, session } = await getOwnedSession(params.id, user.id)
    if (!session) {
      return NextResponse.json({ error: 'No se encontro el chat' }, { status: 404 })
    }

    const nextTitle = String(body.title ?? '').trim()
    const status = body.status === 'archived' ? 'archived' : 'active'
    const patch: Record<string, string> = { status }
    if (nextTitle) patch.title = nextTitle

    const { data: updatedSession, error } = await supabaseAdmin
      .from('script_chat_sessions')
      .update(patch)
      .eq('id', session.id)
      .select('id, title, status, created_at, updated_at')
      .single()

    if (error || !updatedSession) {
      return NextResponse.json({ error: error?.message || 'No se pudo actualizar el chat' }, { status: 500 })
    }

    return NextResponse.json({ session: updatedSession })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo actualizar el chat'
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

    const { supabaseAdmin, session } = await getOwnedSession(params.id, user.id)
    if (!session) {
      return NextResponse.json({ error: 'No se encontro el chat' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('script_chat_sessions')
      .delete()
      .eq('id', session.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo borrar el chat'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
