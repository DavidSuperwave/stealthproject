import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { generateScriptChatCompletion } from '@/lib/script-chat'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const messages = Array.isArray(body.messages) ? body.messages : []
    const result = await generateScriptChatCompletion(messages)

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    const status = message.includes('obligatorio') || message.includes('permit') || message.includes('grande') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
