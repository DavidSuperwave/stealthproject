import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const DEFAULT_MODEL = process.env.OPENROUTER_SCRIPT_MODEL || 'moonshotai/kimi-k2'

function fallbackScript(prompt: string) {
  return `Aqui tienes un borrador de guion para video corto creado desde tu brief:

Hook:
"Si tu cliente ya esta interesado, no lo hagas esperar para entender la oferta."

Escena 1:
Muestra primero el resultado del producto o servicio. Mantén el visual directo y especifico.

Escena 2:
Nombra el problema: produccion lenta de contenido, anuncios inconsistentes o pocas piezas de venta.

Escena 3:
Presenta Doble Labs como una forma mas rapida de convertir material aprobado en variaciones de video listas para vender.

CTA:
"Envia un video base y una muestra de voz. Te ayudamos a convertirlo en contenido listo para vender."

Notas del brief:
${prompt.slice(0, 700)}`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const messages = Array.isArray(body.messages) ? body.messages : []
    const latestUserMessage = [...messages].reverse().find((message) => message?.role === 'user')?.content
    const prompt = String(latestUserMessage || body.prompt || '').trim()

    if (!prompt) {
      return NextResponse.json({ error: 'El mensaje es obligatorio' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        message: fallbackScript(prompt),
        model: 'local-script-draft',
        mode: 'fallback',
      })
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100',
        'X-Title': 'Doble Labs Script Chat',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You write concise, sales-oriented short-form video scripts for TikTok, Instagram Reels, and paid social. Return practical scripts with hook, scenes, voiceover, CTA, and production notes. Do not mention automated posting.',
          },
          ...messages,
        ],
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || 'No se pudo generar el guion' }, { status: 502 })
    }

    return NextResponse.json({
      message: data?.choices?.[0]?.message?.content || fallbackScript(prompt),
      model: data?.model || DEFAULT_MODEL,
      mode: 'openrouter',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
