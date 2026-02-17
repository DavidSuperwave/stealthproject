import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxies file uploads to signed storage URLs (Google Cloud Storage).
 * GCS signed URLs from LipDub don't set CORS headers for localhost,
 * so the browser can't PUT directly. This route streams the file through
 * the server.
 *
 * Usage: PUT /api/proxy-upload?url=<encoded-signed-url>
 * Body: raw file bytes
 * Content-Type: forwarded from the client request
 */
export async function PUT(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get('url')

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Missing "url" query parameter' },
      { status: 400 }
    )
  }

  const contentType = req.headers.get('content-type') || 'application/octet-stream'

  try {
    // Stream the request body to the signed URL
    const body = await req.arrayBuffer()

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

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload proxy failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

// Increase body size limit for video uploads
export const maxDuration = 60
export const dynamic = 'force-dynamic'
