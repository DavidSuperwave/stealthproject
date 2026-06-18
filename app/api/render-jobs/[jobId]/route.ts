import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin, recordJobEvent, syncMockRenderJob, type RenderJobRow } from '@/lib/render-jobs/service'

interface RouteContext {
  params: {
    jobId: string
  }
}

async function getAuthorizedJob(jobId: string, userId: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: job, error } = await supabaseAdmin
    .from('render_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    return { supabaseAdmin, job: null, error: error?.message || 'Render job not found' }
  }

  if (job.user_id !== userId) {
    return { supabaseAdmin, job: null, error: 'Forbidden' }
  }

  return { supabaseAdmin, job: job as RenderJobRow, error: null }
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabaseAdmin, job, error } = await getAuthorizedJob(params.jobId, user.id)
    if (error || !job) {
      return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 404 })
    }

    const synced = await syncMockRenderJob(supabaseAdmin, job)
    const { data: events } = await supabaseAdmin
      .from('job_events')
      .select('*')
      .eq('job_id', params.jobId)
      .order('created_at', { ascending: true })

    return NextResponse.json({ job: synced, events: events ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabaseAdmin, job, error } = await getAuthorizedJob(params.jobId, user.id)
    if (error || !job) {
      return NextResponse.json({ error }, { status: error === 'Forbidden' ? 403 : 404 })
    }

    const body = await req.json()
    const allowedStatuses = new Set(['cancelled', 'failed'])
    const nextStatus = typeof body.status === 'string' ? body.status : null

    if (!nextStatus || !allowedStatuses.has(nextStatus)) {
      return NextResponse.json({ error: 'Only cancelled or failed status updates are supported by this route.' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('render_jobs')
      .update({
        status: nextStatus,
        error_message: body.error_message ?? job.error_message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', params.jobId)
      .select('*')
      .single()

    if (updateErr || !updated) {
      return NextResponse.json({ error: updateErr?.message || 'Could not update render job' }, { status: 500 })
    }

    await recordJobEvent(
      supabaseAdmin,
      params.jobId,
      nextStatus === 'cancelled' ? 'job_cancelled' : 'job_failed',
      body.error_message ?? `Job marked ${nextStatus}.`,
    )

    return NextResponse.json({ job: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
