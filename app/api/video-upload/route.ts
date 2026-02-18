import { NextRequest, NextResponse } from 'next/server'

const LIPDUB_BASE = process.env.LIPDUB_API_URL || 'https://api.lipdub.ai/v1'
const LIPDUB_KEY = process.env.LIPDUB_API_KEY || ''

/**
 * Video upload via Supabase Storage URL
 * 
 * This endpoint accepts a video URL (from Supabase Storage) instead of raw bytes,
 * bypassing Vercel's 4.5MB payload limit.
 * 
 * POST /api/video-upload
 * Body: { videoUrl: string, projectId?: string, options?: {...} }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { videoUrl, projectId, options = {} } = body

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Missing "videoUrl" in request body' },
        { status: 400 }
      )
    }

    // Validate URL is from Supabase Storage
    if (!isValidSupabaseUrl(videoUrl)) {
      return NextResponse.json(
        { error: 'Invalid videoUrl. Must be a Supabase Storage URL.' },
        { status: 400 }
      )
    }

    // Call LipDub API with the video URL
    // LipDub supports URL-based uploads
    const lipdubPayload = {
      video_url: videoUrl,
      project_id: projectId,
      ...options,
    }

    const res = await fetch(`${LIPDUB_BASE}/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LIPDUB_KEY,
      },
      body: JSON.stringify(lipdubPayload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json(
        { error: `LipDub API error: ${res.status}`, details: errorText },
        { status: res.status }
      )
    }

    const data = await res.json()
    
    return NextResponse.json({
      success: true,
      videoId: data.id,
      status: data.status,
      url: videoUrl,
      lipdubResponse: data,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Get video processing status
 * GET /api/video-upload?videoId=xxx
 */
export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId')

  if (!videoId) {
    return NextResponse.json(
      { error: 'Missing "videoId" query parameter' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(`${LIPDUB_BASE}/video/${videoId}/status`, {
      headers: {
        'x-api-key': LIPDUB_KEY,
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json(
        { error: `LipDub API error: ${res.status}`, details: errorText },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Status check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Validate URL is from Supabase Storage
 */
function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Allow Supabase storage URLs and localhost for testing
    return (
      parsed.hostname.includes('supabase.co') ||
      parsed.hostname.includes('supabase.in') ||
      parsed.hostname === 'localhost'
    )
  } catch {
    return false
  }
}

export const maxDuration = 60
export const dynamic = 'force-dynamic'
