/**
 * Server-side LipDub API client.
 * Calls LipDub directly with the API key (no proxy needed).
 */

const LIPDUB_BASE = process.env.LIPDUB_API_URL || 'https://api.lipdub.ai/v1'
const LIPDUB_KEY = process.env.LIPDUB_API_KEY || ''

async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${LIPDUB_BASE}${endpoint}`
  const headers: Record<string, string> = {
    'x-api-key': LIPDUB_KEY,
    ...(options.headers as Record<string, string>),
  }

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`LipDub API Error ${res.status}: ${error}`)
  }

  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/** Safely unwrap { data: ... } wrapper that LipDub uses on some endpoints */
function unwrap(response: any): any {
  return response?.data ?? response ?? {}
}

export const lipdubServer = {
  async getVideoStatus(videoId: string) {
    const data = await request(`/video/status/${videoId}`)
    return unwrap(data) as {
      shot_id: number | null
      upload_status: string
      shot_status: string | null
      ai_training_status: string | null
    }
  },

  async getShotStatus(shotId: number) {
    const data = await request(`/shots/${shotId}/status`)
    return unwrap(data) as {
      shot_status: 'pending' | 'running' | 'finished' | 'failed' | 'not_started'
      ai_training_status: 'not_started' | 'processing' | 'finished' | 'failed'
    }
  },

  async getAudioStatus(audioId: string) {
    const data = await request(`/audio/status/${audioId}`)
    return unwrap(data) as {
      audio_id: string
      upload_status: string
    }
  },

  async generateVideo(shotId: number, params: { output_filename: string; audio_id: string; language?: string; maintain_expression?: boolean }) {
    const data = await request(`/shots/${shotId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    console.log('[LipDub Server] generateVideo raw response:', JSON.stringify(data))
    const result = unwrap(data)
    const genId = result.generate_id ?? result.generateId ?? result.id
    if (genId == null) {
      throw new Error(`LipDub generate returned no generate_id: ${JSON.stringify(data)}`)
    }
    return {
      generate_id: String(genId),
      status: result.status ?? 'processing',
    }
  },

  async getGenerationStatus(shotId: number, generateId: string) {
    const data = await request(`/shots/${shotId}/generate/${generateId}`)
    // Generation status may or may not be wrapped in { data }
    const result = data?.data ?? data ?? {}
    return {
      status: result.status ?? 'processing',
      ...result,
    } as {
      status: string
      [key: string]: unknown
    }
  },

  async getDownloadUrl(shotId: number, generateId: string) {
    const data = await request(`/shots/${shotId}/generate/${generateId}/download`)
    const result = data?.data ?? data ?? {}
    return result as {
      download_url: string
    }
  },
}
