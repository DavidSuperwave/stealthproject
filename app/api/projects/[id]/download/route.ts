import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { lipdubServer } from '@/lib/lipdub-server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the latest completed generation job for this project
    const { data: job, error: jobErr } = await supabase
      .from('generation_jobs')
      .select('shot_id, generate_id, status')
      .eq('project_id', projectId)
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

    // Get download URL from LipDub
    const result = await lipdubServer.getDownloadUrl(job.shot_id, job.generate_id)

    if (!result.download_url) {
      return NextResponse.json(
        { error: 'No se pudo obtener el enlace de descarga' },
        { status: 502 }
      )
    }

    // Redirect to the download URL
    return NextResponse.redirect(result.download_url)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al obtener descarga'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
