import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)
    const { data: sessions, error } = await supabaseAdmin
      .from('script_chat_sessions')
      .select('id, title, status, created_at, updated_at')
      .eq('workspace_id', context.workspaceId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions: sessions ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudieron cargar los chats'
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

    const body = await req.json().catch(() => ({}))
    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)
    const title = String(body.title ?? '').trim() || 'Nuevo chat'

    const { data: session, error } = await supabaseAdmin
      .from('script_chat_sessions')
      .insert({
        workspace_id: context.workspaceId,
        brand_id: context.brandId,
        user_id: user.id,
        title,
      })
      .select('id, title, status, created_at, updated_at')
      .single()

    if (error || !session) {
      return NextResponse.json({ error: error?.message || 'No se pudo crear el chat' }, { status: 500 })
    }

    return NextResponse.json({ session, messages: [] }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo crear el chat'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
