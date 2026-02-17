import { NextRequest, NextResponse } from 'next/server'

const LIPDUB_BASE = process.env.LIPDUB_API_URL || 'https://api.lipdub.ai/v1'
const LIPDUB_KEY = process.env.LIPDUB_API_KEY || ''

/**
 * Single-endpoint proxy for LipDub API.
 * Usage: /api/lipdub?path=video or /api/lipdub?path=shots/123/status
 * Keeps the API key server-side (never exposed to the browser).
 */
async function proxyToLipdub(req: NextRequest) {
  const apiPath = req.nextUrl.searchParams.get('path')

  if (!apiPath) {
    return NextResponse.json({ error: 'Missing "path" query parameter' }, { status: 400 })
  }

  const targetUrl = `${LIPDUB_BASE}/${apiPath}`

  const headers: Record<string, string> = {
    'x-api-key': LIPDUB_KEY,
  }

  const contentType = req.headers.get('content-type')
  if (contentType) {
    headers['Content-Type'] = contentType
  }

  let body: string | null = null
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text()
  }

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    })

    const responseText = await res.text()

    return new NextResponse(responseText, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function GET(req: NextRequest) {
  return proxyToLipdub(req)
}

export async function POST(req: NextRequest) {
  return proxyToLipdub(req)
}

export async function PUT(req: NextRequest) {
  return proxyToLipdub(req)
}
