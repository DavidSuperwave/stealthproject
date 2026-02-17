import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { lipdubServer } from '@/lib/lipdub-server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * POST /api/generation/start
 * Body: { project_id, user_id, shot_id, audio_id }
 *
 * Calls LipDub generate, creates a generation_job row, returns the job.
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await req.json()
    const { project_id, user_id, shot_id, audio_id } = body

    if (!project_id || !user_id || !shot_id || !audio_id) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, user_id, shot_id, audio_id' },
        { status: 400 },
      )
    }

    // Call LipDub generate
    const generate = await lipdubServer.generateVideo(shot_id, {
      output_filename: `generated_${Date.now()}.mp4`,
      audio_id,
    })

    // Create generation_job in DB
    const { data: job, error: dbErr } = await supabaseAdmin
      .from('generation_jobs')
      .insert({
        project_id,
        user_id,
        shot_id,
        generate_id: generate.generate_id,
        audio_id,
        status: 'processing',
        progress: 0,
        current_step: 'generating',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbErr) {
      console.error('Failed to create generation job:', dbErr)
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    // Update project status to processing
    await supabaseAdmin
      .from('projects')
      .update({ status: 'processing' })
      .eq('id', project_id)

    return NextResponse.json({ job, generate_id: generate.generate_id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Generation start failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
