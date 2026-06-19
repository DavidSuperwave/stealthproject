import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'
import { apiErrorResponse } from '@/lib/api/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(admin, user.id)

    const { data: asset, error } = await admin
      .from('video_assets')
      .select('id, workspace_id, brand_id, storage_path, public_url, source_url')
      .eq('id', params.id)
      .single()

    if (error || !asset) {
      return NextResponse.json({ error: 'No se encontro el recurso' }, { status: 404 })
    }

    if (asset.workspace_id !== context.workspaceId || asset.brand_id !== context.brandId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (asset.storage_path) {
      const { data: signed, error: signedError } = await admin
        .storage
        .from('videos')
        .createSignedUrl(asset.storage_path, 5 * 60)

      if (signedError || !signed?.signedUrl) {
        return NextResponse.json({ error: 'No se pudo crear el enlace de descarga' }, { status: 502 })
      }

      return NextResponse.redirect(signed.signedUrl)
    }

    const fallbackUrl = asset.public_url || asset.source_url
    if (fallbackUrl) {
      return NextResponse.redirect(fallbackUrl)
    }

    return NextResponse.json({ error: 'Este recurso no tiene archivo descargable' }, { status: 404 })
  } catch (error) {
    return apiErrorResponse(error, 'No se pudo descargar el recurso')
  }
}
