import { NextRequest, NextResponse } from 'next/server'
import { lipdubServer } from '@/lib/lipdub-server'
import {
  apiErrorResponse,
  assertProjectOwner,
  getSupabaseAdmin,
  requireUser
} from '@/lib/api/auth'

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const { user } = await requireUser()
    const body = await req.json()
    const { project_id, shot_id, audio_id } = body
    const creditsReserved = Number(body.credits_reserved || body.credits_to_deduct || 0)

    if (!project_id || !shot_id || !audio_id) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, shot_id, audio_id' },
        { status: 400 }
      )
    }

    await assertProjectOwner(admin, user.id, project_id)

    const generate = await lipdubServer.generateVideo(shot_id, {
      output_filename: `generated_${Date.now()}.mp4`,
      audio_id
    })

    const { data: job, error: dbErr } = await admin
      .from('generation_jobs')
      .insert({
        project_id,
        user_id: user.id,
        shot_id,
        generate_id: generate.generate_id,
        audio_id,
        status: 'processing',
        progress: 0,
        current_step: 'generating',
        credits_reserved: Number.isFinite(creditsReserved) ? creditsReserved : 0,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbErr) {
      console.error('Failed to create generation job:', dbErr)
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    await admin
      .from('projects')
      .update({ status: 'processing' })
      .eq('id', project_id)

    return NextResponse.json({ job, generate_id: generate.generate_id })
  } catch (error) {
    return apiErrorResponse(error, 'Generation start failed')
  }
}
