import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'
import { generateScriptChatCompletion, sanitizeAttachments, type ScriptChatMessage } from '@/lib/script-chat'

interface RouteContext {
  params: {
    id: string
  }
}

function titleFromPrompt(content: string) {
  return content.replace(/\s+/g, ' ').trim().slice(0, 60) || 'Nuevo chat'
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const content = String(body.content ?? '').trim()
    const attachments = sanitizeAttachments(body.attachments)

    if (!content && attachments.length === 0) {
      return NextResponse.json({ error: 'El mensaje es obligatorio' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('script_chat_sessions')
      .select('id, workspace_id, brand_id, user_id, title')
      .eq('id', params.id)
      .eq('workspace_id', context.workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (sessionErr) {
      return NextResponse.json({ error: sessionErr.message }, { status: 500 })
    }
    if (!session) {
      return NextResponse.json({ error: 'No se encontro el chat' }, { status: 404 })
    }

    const { data: userMessage, error: userMessageErr } = await supabaseAdmin
      .from('script_chat_messages')
      .insert({
        session_id: session.id,
        role: 'user',
        content,
        attachments,
      })
      .select('id, role, content, attachments, model, created_at')
      .single()

    if (userMessageErr || !userMessage) {
      return NextResponse.json({ error: userMessageErr?.message || 'No se pudo guardar el mensaje' }, { status: 500 })
    }

    const { data: history, error: historyErr } = await supabaseAdmin
      .from('script_chat_messages')
      .select('role, content, attachments')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })

    if (historyErr) {
      return NextResponse.json({ error: historyErr.message }, { status: 500 })
    }

    const completion = await generateScriptChatCompletion((history ?? []) as ScriptChatMessage[])
    const { data: assistantMessage, error: assistantErr } = await supabaseAdmin
      .from('script_chat_messages')
      .insert({
        session_id: session.id,
        role: 'assistant',
        content: completion.message,
        attachments: [],
        model: completion.model,
      })
      .select('id, role, content, attachments, model, created_at')
      .single()

    if (assistantErr || !assistantMessage) {
      return NextResponse.json({ error: assistantErr?.message || 'No se pudo guardar la respuesta' }, { status: 500 })
    }

    const nextTitle = session.title === 'Nuevo chat' ? titleFromPrompt(content) : session.title
    const { data: updatedSession } = await supabaseAdmin
      .from('script_chat_sessions')
      .update({ title: nextTitle })
      .eq('id', session.id)
      .select('id, title, status, created_at, updated_at')
      .single()

    return NextResponse.json({
      session: updatedSession,
      userMessage,
      assistantMessage,
      model: completion.model,
      mode: completion.mode,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo enviar el mensaje'
    const status = message.includes('obligatorio') || message.includes('permit') || message.includes('grande') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
