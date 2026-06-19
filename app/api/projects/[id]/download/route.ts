import { NextRequest, NextResponse } from 'next/server'
import { lipdubServer } from '@/lib/lipdub-server'
import {
  apiErrorResponse,
  assertProjectOwner,
  getSupabaseAdmin,
  requireUser
} from '@/lib/api/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getSupabaseAdmin()
    const { user } = await requireUser()
    const projectId = params.id

    await assertProjectOwner(admin, user.id, projectId)

    const { data: job, error: jobErr } = await admin
      .from('generation_jobs')
      .select('shot_id, generate_id, status, user_id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (jobErr || !job || !job.shot_id || !job.generate_id) {
      return NextResponse.json(
        { error: 'No hay video completado para este proyecto' },
        { status: 404 }
      )
    }

    const result = await lipdubServer.getDownloadUrl(job.shot_id, job.generate_id)

    if (!result.download_url) {
      return NextResponse.json(
        { error: 'No se pudo obtener el enlace de descarga' },
        { status: 502 }
      )
    }

    return NextResponse.redirect(result.download_url)
  } catch (error) {
    return apiErrorResponse(error, 'Error al obtener descarga')
  }
}
