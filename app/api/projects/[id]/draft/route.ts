import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface DraftBody {
  video?: {
    lipdub_project_id?: number
    lipdub_scene_id?: number
    lipdub_actor_id?: number
    lipdub_video_id?: string
    file_name?: string
    file_size?: number
    upload_status?: string
  }
  audio?: {
    audio_id?: string
    file_name?: string
    content_type?: string
    upload_status?: string
  }
  generation?: {
    shot_id: number
    generate_id: string
    audio_id?: string
    status?: string
    progress?: number
    current_step?: string
    download_url?: string
    error?: string
  }
  status?: 'draft' | 'processing' | 'completed' | 'failed'
}

export async function POST(
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

    const body: DraftBody = await req.json()

    // Update project status if provided
    if (body.status) {
      await supabase
        .from('projects')
        .update({ status: body.status })
        .eq('id', projectId)
        .eq('user_id', user.id)
    }

    // Upsert video data
    if (body.video) {
      const { data: existingVideo } = await supabase
        .from('videos')
        .select('id')
        .eq('project_id', projectId)
        .limit(1)
        .maybeSingle()

      if (existingVideo?.id) {
        await supabase
          .from('videos')
          .update(body.video)
          .eq('id', existingVideo.id)
      } else {
        await supabase
          .from('videos')
          .insert({ project_id: projectId, ...body.video })
      }
    }

    // Upsert audio data
    if (body.audio) {
      const { data: existingAudio } = await supabase
        .from('audio_files')
        .select('id')
        .eq('project_id', projectId)
        .limit(1)
        .maybeSingle()

      if (existingAudio?.id) {
        await supabase
          .from('audio_files')
          .update(body.audio)
          .eq('id', existingAudio.id)
      } else {
        await supabase
          .from('audio_files')
          .insert({ project_id: projectId, ...body.audio })
      }
    }

    // Upsert generation job data
    if (body.generation) {
      const { data: existingJob } = await supabase
        .from('generation_jobs')
        .select('id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const requestedStatus = body.generation.status || 'processing'
      const status = requestedStatus === 'completed' && !body.generation.download_url ? 'processing' : requestedStatus
      const genPayload = {
        shot_id: body.generation.shot_id,
        generate_id: body.generation.generate_id,
        audio_id: body.generation.audio_id ?? null,
        status,
        progress: body.generation.progress ?? (status === 'completed' ? 100 : 70),
        current_step: body.generation.current_step ?? (status === 'completed' ? 'completed' : 'generating'),
        download_url: body.generation.download_url ?? null,
        error: body.generation.error ?? null,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      }

      if (existingJob?.id) {
        await supabase
          .from('generation_jobs')
          .update(genPayload)
          .eq('id', existingJob.id)
      } else {
        await supabase
          .from('generation_jobs')
          .insert({
            project_id: projectId,
            user_id: user.id,
            ...genPayload,
            started_at: new Date().toISOString(),
          })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save draft'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
