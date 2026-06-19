type ChatRole = 'user' | 'assistant' | 'system'

export type ScriptChatAttachment = {
  id?: string
  name: string
  type: string
  size: number
  kind: 'text' | 'image'
  content?: string
  dataUrl?: string
}

export type ScriptChatMessage = {
  role: ChatRole
  content: string
  attachments?: ScriptChatAttachment[]
}

const DEFAULT_MODEL = process.env.OPENROUTER_SCRIPT_MODEL || 'moonshotai/kimi-k2.6'
const MAX_ATTACHMENTS = 6
const MAX_TEXT_ATTACHMENT_CHARS = 12000
const MAX_IMAGE_DATA_URL_CHARS = 8_000_000

function fallbackScript(prompt: string) {
  return `Aqui tienes un borrador de guion para video corto creado desde tu brief:

Hook:
"Si tu cliente ya esta interesado, no lo hagas esperar para entender la oferta."

Escena 1:
Muestra primero el resultado del producto o servicio. Manten el visual directo y especifico.

Escena 2:
Nombra el problema: produccion lenta de contenido, anuncios inconsistentes o pocas piezas de venta.

Escena 3:
Presenta Doble Labs como una forma mas rapida de convertir material aprobado en variaciones de video listas para vender.

CTA:
"Envia un video base y una muestra de voz. Te ayudamos a convertirlo en contenido listo para vender."

Notas del brief:
${prompt.slice(0, 700)}`
}

function isAllowedTextAttachment(attachment: ScriptChatAttachment) {
  const lowerName = attachment.name.toLowerCase()
  return (
    attachment.kind === 'text' &&
    (attachment.type === 'text/plain' ||
      attachment.type === 'text/markdown' ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md'))
  )
}

function isAllowedImageAttachment(attachment: ScriptChatAttachment) {
  return (
    attachment.kind === 'image' &&
    attachment.type.startsWith('image/') &&
    typeof attachment.dataUrl === 'string' &&
    attachment.dataUrl.startsWith('data:image/')
  )
}

export function sanitizeAttachments(rawAttachments: unknown): ScriptChatAttachment[] {
  if (!Array.isArray(rawAttachments)) return []
  if (rawAttachments.length > MAX_ATTACHMENTS) {
    throw new Error(`Solo puedes adjuntar hasta ${MAX_ATTACHMENTS} archivos por mensaje.`)
  }

  return rawAttachments.map((raw) => {
    const attachment = raw as Partial<ScriptChatAttachment>
    const normalized: ScriptChatAttachment = {
      id: typeof attachment.id === 'string' ? attachment.id : undefined,
      name: String(attachment.name ?? '').trim(),
      type: String(attachment.type ?? '').trim().toLowerCase(),
      size: Number.isFinite(Number(attachment.size)) ? Number(attachment.size) : 0,
      kind: attachment.kind === 'image' ? 'image' : 'text',
      content: typeof attachment.content === 'string' ? attachment.content : undefined,
      dataUrl: typeof attachment.dataUrl === 'string' ? attachment.dataUrl : undefined,
    }

    if (!normalized.name) {
      throw new Error('Cada archivo necesita un nombre.')
    }
    if (normalized.type.startsWith('video/')) {
      throw new Error('No se permiten videos en el chat de guiones.')
    }
    if (normalized.kind === 'text') {
      if (!isAllowedTextAttachment(normalized)) {
        throw new Error('Solo se permiten archivos .txt, .md e imagenes.')
      }
      normalized.content = String(normalized.content ?? '').slice(0, MAX_TEXT_ATTACHMENT_CHARS)
      delete normalized.dataUrl
      return normalized
    }

    if (!isAllowedImageAttachment(normalized)) {
      throw new Error('Solo se permiten imagenes validas.')
    }
    if ((normalized.dataUrl?.length ?? 0) > MAX_IMAGE_DATA_URL_CHARS) {
      throw new Error('La imagen adjunta es demasiado grande.')
    }
    delete normalized.content
    return normalized
  })
}

function latestPrompt(messages: ScriptChatMessage[]) {
  const latest = [...messages].reverse().find((message) => message.role === 'user')
  return String(latest?.content ?? '').trim()
}

function toOpenRouterMessage(message: ScriptChatMessage) {
  const attachments = sanitizeAttachments(message.attachments ?? [])
  const textParts = [
    message.content,
    ...attachments
      .filter((attachment) => attachment.kind === 'text')
      .map((attachment) => `\n\nArchivo ${attachment.name}:\n${attachment.content ?? ''}`),
  ].filter(Boolean)

  const imageParts = attachments
    .filter((attachment) => attachment.kind === 'image' && attachment.dataUrl)
    .map((attachment) => ({
      type: 'image_url',
      image_url: { url: attachment.dataUrl },
    }))

  if (imageParts.length === 0) {
    return {
      role: message.role,
      content: textParts.join('\n'),
    }
  }

  return {
    role: message.role,
    content: [
      { type: 'text', text: textParts.join('\n') || 'Usa los adjuntos para generar ideas de guion.' },
      ...imageParts,
    ],
  }
}

export async function generateScriptChatCompletion(messages: ScriptChatMessage[]) {
  const prompt = latestPrompt(messages)

  if (!prompt && messages.every((message) => !message.attachments?.length)) {
    throw new Error('El mensaje es obligatorio')
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return {
      message: fallbackScript(prompt),
      model: 'local-script-draft',
      mode: 'fallback',
    }
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
        ...messages.map(toOpenRouterMessage),
      ],
      temperature: 0.7,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message || 'No se pudo generar el guion')
  }

  return {
    message: data?.choices?.[0]?.message?.content || fallbackScript(prompt),
    model: data?.model || DEFAULT_MODEL,
    mode: 'openrouter',
  }
}
