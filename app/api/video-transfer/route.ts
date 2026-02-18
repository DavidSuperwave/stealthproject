import { NextRequest, NextResponse } from 'next/server'

const LIPDUB_BASE = process.env.LIPDUB_API_URL || 'https://api.lipdub.ai/v1'
const LIPDUB_KEY = process.env.LIPDUB_API_KEY || ''

/**
 * Stream video from Supabase to LipDub GCS URL
 * 
 * This bypasses Vercel's 4.5MB payload limit by streaming:
 * Supabase → Our server → LipDub GCS (with minimal buffering)
 * 
 * POST /api/video-transfer
 * Body: { 
 *   supabaseUrl: string,     // Source URL from Supabase
 *   lipdubUploadUrl: string, // Target GCS signed URL from LipDub
 *   videoId: string          // LipDub video ID
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { supabaseUrl, lipdubUploadUrl, videoId, successUrl, failureUrl } = body

    if (!supabaseUrl || !lipdubUploadUrl || !videoId) {
      return NextResponse.json(
        { error: 'Missing required fields: supabaseUrl, lipdubUploadUrl, videoId' },
        { status: 400 }
      )
    }

    // Validate URLs
    if (!isValidSupabaseUrl(supabaseUrl)) {
      return NextResponse.json(
        { error: 'Invalid supabaseUrl' },
        { status: 400 }
      )
    }

    console.log(`[Video Transfer] Starting transfer for video ${videoId}`)
    console.log(`[Video Transfer] From: ${supabaseUrl}`)
    console.log(`[Video Transfer] To: LipDub GCS`)

    // Step 1: Fetch from Supabase with streaming
    const supabaseRes = await fetch(supabaseUrl, {
      method: 'GET',
    })

    if (!supabaseRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from Supabase: ${supabaseRes.status}` },
        { status: 502 }
      )
    }

    if (!supabaseRes.body) {
      return NextResponse.json(
        { error: 'No response body from Supabase' },
        { status: 502 }
      )
    }

    const contentType = supabaseRes.headers.get('content-type') || 'video/mp4'
    const contentLength = supabaseRes.headers.get('content-length')

    console.log(`[Video Transfer] Supabase response: ${contentType}, ${contentLength ? (parseInt(contentLength)/1024/1024).toFixed(2) + 'MB' : 'unknown size'}`)

    // Step 2: Stream to LipDub GCS URL
    // Note: We're streaming directly without buffering the whole file
    const gcsRes = await fetch(lipdubUploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        ...(contentLength && { 'Content-Length': contentLength }),
      },
      body: supabaseRes.body, // Stream the body directly
      // @ts-ignore - duplex option for streaming
      duplex: 'half',
    })

    if (!gcsRes.ok) {
      const errorText = await gcsRes.text()
      console.error(`[Video Transfer] GCS upload failed: ${gcsRes.status}`, errorText)
      return NextResponse.json(
        { error: `GCS upload failed: ${gcsRes.status}`, details: errorText },
        { status: 502 }
      )
    }

    console.log(`[Video Transfer] GCS upload successful`)

    // Step 3: Notify LipDub of successful upload
    let lipdubData = null
    if (successUrl) {
      try {
        const successRes = await fetch(successUrl, {
          method: 'POST',
          headers: {
            'x-api-key': LIPDUB_KEY,
          },
        })
        
        if (successRes.ok) {
          lipdubData = await successRes.json()
          console.log(`[Video Transfer] LipDub notified successfully`)
        } else {
          console.warn(`[Video Transfer] LipDub notification failed: ${successRes.status}`)
        }
      } catch (err) {
        console.warn(`[Video Transfer] LipDub notification error:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      videoId,
      message: 'Video transferred successfully',
      lipdubData,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transfer failed'
    console.error(`[Video Transfer] Error:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Validate URL is from Supabase Storage
 */
function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.hostname.includes('supabase.co') ||
      parsed.hostname.includes('supabase.in') ||
      parsed.hostname === 'localhost'
    )
  } catch {
    return false
  }
}

export const maxDuration = 300 // 5 minutes for large file transfers
export const dynamic = 'force-dynamic'
