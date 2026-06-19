import { NextRequest, NextResponse } from 'next/server'
import {
  apiErrorResponse,
  assertStorageObjectOwner,
  assertTrustedUploadTarget,
  getSupabaseAdmin,
  requireUser,
  storagePathFromSupabaseUrl
} from '@/lib/api/auth'

const LIPDUB_KEY = process.env.LIPDUB_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const { user } = await requireUser()
    const body = await req.json()
    const { lipdubUploadUrl, videoId, successUrl } = body
    const storagePath = assertStorageObjectOwner(
      body.storagePath || storagePathFromSupabaseUrl(body.supabaseUrl),
      user.id
    )
    const uploadTarget = assertTrustedUploadTarget(lipdubUploadUrl)

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    const { data: signed, error: signedError } = await admin
      .storage
      .from('videos')
      .createSignedUrl(storagePath, 10 * 60)

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: 'No se pudo leer el video privado de origen' },
        { status: 502 }
      )
    }

    const sourceRes = await fetch(signed.signedUrl, { method: 'GET' })

    if (!sourceRes.ok || !sourceRes.body) {
      return NextResponse.json(
        { error: `No se pudo leer el video de origen: ${sourceRes.status}` },
        { status: 502 }
      )
    }

    const contentType = sourceRes.headers.get('content-type') || 'video/mp4'
    const contentLength = sourceRes.headers.get('content-length')

    const gcsRes = await fetch(uploadTarget, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        ...(contentLength && { 'Content-Length': contentLength })
      },
      body: sourceRes.body,
      // @ts-expect-error duplex is required by Node fetch for streamed uploads.
      duplex: 'half'
    })

    if (!gcsRes.ok) {
      const errorText = await gcsRes.text()
      return NextResponse.json(
        { error: `GCS upload failed: ${gcsRes.status}`, details: errorText },
        { status: 502 }
      )
    }

    let lipdubData = null
    if (successUrl) {
      const success = new URL(successUrl)
      if (success.protocol === 'https:') {
        const successRes = await fetch(success, {
          method: 'POST',
          headers: { 'x-api-key': LIPDUB_KEY }
        })

        if (successRes.ok) {
          lipdubData = await successRes.json()
        }
      }
    }

    return NextResponse.json({
      success: true,
      videoId,
      storagePath,
      lipdubData
    })
  } catch (error) {
    return apiErrorResponse(error, 'Transfer failed')
  }
}

export const maxDuration = 300
export const dynamic = 'force-dynamic'
