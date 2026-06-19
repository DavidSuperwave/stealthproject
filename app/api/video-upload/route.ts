import { NextRequest, NextResponse } from 'next/server'
import {
  apiErrorResponse,
  assertProjectOwner,
  assertStorageObjectOwner,
  getSupabaseAdmin,
  requireUser,
  storagePathFromSupabaseUrl
} from '@/lib/api/auth'

const LIPDUB_BASE = process.env.LIPDUB_API_URL || 'https://api.lipdub.ai/v1'
const LIPDUB_KEY = process.env.LIPDUB_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const { user } = await requireUser()
    const body = await req.json()
    const { projectId, options = {} } = body
    const storagePath = assertStorageObjectOwner(
      body.storagePath || storagePathFromSupabaseUrl(body.videoUrl),
      user.id
    )

    if (projectId) {
      await assertProjectOwner(admin, user.id, projectId)
    }

    const { data: signed, error: signedError } = await admin
      .storage
      .from('videos')
      .createSignedUrl(storagePath, 10 * 60)

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: 'No se pudo crear un enlace privado para el video' },
        { status: 502 }
      )
    }

    const res = await fetch(`${LIPDUB_BASE}/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LIPDUB_KEY
      },
      body: JSON.stringify({
        video_url: signed.signedUrl,
        project_id: projectId,
        ...options
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json(
        { error: `Error al procesar el video: ${res.status}`, details: errorText },
        { status: res.status }
      )
    }

    const data = await res.json()

    return NextResponse.json({
      success: true,
      videoId: data.id,
      status: data.status,
      storagePath,
      lipdubResponse: data
    })
  } catch (error) {
    return apiErrorResponse(error, 'Upload failed')
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const { user } = await requireUser()
    const videoId = req.nextUrl.searchParams.get('videoId')
    const projectId = req.nextUrl.searchParams.get('projectId')

    if (!videoId || !projectId) {
      return NextResponse.json(
        { error: 'videoId and projectId query parameters are required' },
        { status: 400 }
      )
    }

    await assertProjectOwner(admin, user.id, projectId)

    const res = await fetch(`${LIPDUB_BASE}/video/${videoId}/status`, {
      headers: {
        'x-api-key': LIPDUB_KEY
      }
    })

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json(
        { error: `Error al procesar el video: ${res.status}`, details: errorText },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return apiErrorResponse(error, 'Status check failed')
  }
}

export const maxDuration = 60
export const dynamic = 'force-dynamic'
