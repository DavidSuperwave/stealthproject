import { NextRequest, NextResponse } from 'next/server'

/**
 * ⚠️ DEPRECATED: This route is subject to Vercel's 4.5MB payload limit.
 * 
 * For videos larger than 4.5MB, use the new Supabase Storage upload:
 * - Frontend: Use `useVideoUpload` hook or `<VideoUpload />` component
 * - API: POST to /api/video-upload with the Supabase Storage URL
 * 
 * @see /VIDEO_UPLOAD_FIX.md for migration guide
 * @see /hooks/use-video-upload.ts
 * @see /app/api/video-upload/route.ts
 */

/**
 * Proxies file uploads to signed storage URLs (Google Cloud Storage).
 * GCS signed URLs from LipDub don't set CORS headers for localhost,
 * so the browser can't PUT directly. This route streams the file through
 * the server.
 *
 * Usage: PUT /api/proxy-upload?url=<encoded-signed-url>
 * Body: raw file bytes
 * Content-Type: forwarded from the client request
 * 
 * ⚠️ Limited to 4.5MB due to Vercel serverless constraints
 */
export async function PUT(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get('url')

  if (!targetUrl) {
    return NextResponse.json(
      { 
        error: 'Missing "url" query parameter',
        notice: 'For files >4.5MB, use Supabase Storage upload instead. See VIDEO_UPLOAD_FIX.md'
      },
      { status: 400 }
    )
  }

  const contentType = req.headers.get('content-type') || 'application/octet-stream'

  // Check Content-Length header for early rejection
  const contentLength = req.headers.get('content-length')
  if (contentLength) {
    const sizeMB = parseInt(contentLength) / (1024 * 1024)
    if (sizeMB > 4.5) {
      return NextResponse.json(
        { 
          error: `File too large (${sizeMB.toFixed(1)}MB). Max is 4.5MB for this endpoint.`,
          solution: 'Use Supabase Storage upload for larger files',
          docs: '/VIDEO_UPLOAD_FIX.md'
        },
        { status: 413 }
      )
    }
  }

  try {
    // Stream the request body to the signed URL
    const body = await req.arrayBuffer()

    // Double-check size after reading (for streaming requests without Content-Length)
    if (body.byteLength > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        { 
          error: `File too large (${(body.byteLength / 1024 / 1024).toFixed(1)}MB). Max is 4.5MB for this endpoint.`,
          solution: 'Use Supabase Storage upload for larger files',
          docs: '/VIDEO_UPLOAD_FIX.md'
        },
        { status: 413 }
      )
    }

    const res = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body,
    })

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json(
        { error: `Storage upload failed: ${res.status}`, details: errorText },
        { status: res.status }
      )
    }

    return NextResponse.json({ 
      ok: true,
      notice: 'Consider migrating to Supabase Storage for larger files'
    }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload proxy failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

// Increase body size limit for video uploads (though Vercel hard limit is 4.5MB)
export const maxDuration = 60
export const dynamic = 'force-dynamic'
