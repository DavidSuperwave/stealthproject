import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { lipdubServer } from '@/lib/lipdub-server'
import { sendCompletionEmail, sendFailureEmail } from '@/lib/email'

const CRON_SECRET = process.env.CRON_SECRET || ''
const MOCK_DURATION_MS = 45_000

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * GET /api/cron/poll-generation
 *
 * Called by Vercel Cron (or manually) every minute.
 * Polls LipDub for all pending generation jobs, updates DB status,
 * and triggers notifications + email on completion or failure.
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()

  // Verify cron secret (Vercel sends this as Authorization header)
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET) {
    console.error('CRON_SECRET is not set — rejecting cron request')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all pending jobs
    const { data: jobs, error: fetchErr } = await supabaseAdmin
      .from('generation_jobs')
      .select('*')
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: true })

    if (fetchErr) {
      console.error('Failed to fetch pending jobs:', fetchErr)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs', processed: 0 })
    }

    let processed = 0
    let completed = 0
    let failed = 0

    for (const job of jobs) {
      const isMockJob = job.current_step === 'mock' || String(job.generate_id ?? '').startsWith('mock_')
      if (isMockJob) {
        const elapsedMs = Date.now() - new Date(job.started_at || job.created_at).getTime()
        if (elapsedMs >= MOCK_DURATION_MS) {
          await supabaseAdmin
            .from('generation_jobs')
            .update({
              status: 'completed',
              progress: 100,
              current_step: 'mock',
              download_url: job.download_url || 'https://example.com/doble-labs-mock-video.mp4',
              completed_at: new Date().toISOString(),
            })
            .eq('id', job.id)

          await supabaseAdmin
            .from('projects')
            .update({ status: 'completed' })
            .eq('id', job.project_id)

          completed++
        } else {
          const progress = Math.min(Math.max(job.progress || 5, Math.round(5 + (elapsedMs / MOCK_DURATION_MS) * 90)), 95)
          await supabaseAdmin
            .from('generation_jobs')
            .update({
              status: elapsedMs < 5_000 ? 'queued' : 'processing',
              progress,
              current_step: 'mock',
            })
            .eq('id', job.id)
        }
        processed++
        continue
      }

      if (!job.shot_id || !job.generate_id) continue

      try {
        const genStatus = await lipdubServer.getGenerationStatus(job.shot_id, job.generate_id)

        const normalizedStatus = String(genStatus.status).toLowerCase()

        if (normalizedStatus === 'completed' || normalizedStatus === 'finished') {
          // Get download URL
          let downloadUrl: string | null = null
          try {
            const dl = await lipdubServer.getDownloadUrl(job.shot_id, job.generate_id)
            downloadUrl = dl.download_url
          } catch (dlErr) {
            console.warn(`Could not get download URL for job ${job.id}:`, dlErr)
          }

          if (!downloadUrl) {
            await supabaseAdmin
              .from('generation_jobs')
              .update({
                status: 'processing',
                progress: Math.max(job.progress || 0, 95),
                current_step: 'download_pending',
              })
              .eq('id', job.id)
            processed++
            continue
          }

          // Update job
          await supabaseAdmin
            .from('generation_jobs')
            .update({
              status: 'completed',
              progress: 100,
              current_step: 'completed',
              download_url: downloadUrl,
              completed_at: new Date().toISOString(),
            })
            .eq('id', job.id)

          // Update project status
          await supabaseAdmin
            .from('projects')
            .update({ status: 'completed' })
            .eq('id', job.project_id)

          // Create in-app notification
          if (job.user_id) {
            // Get project name for the notification
            const { data: project } = await supabaseAdmin
              .from('projects')
              .select('name')
              .eq('id', job.project_id)
              .single()

            const projectName = project?.name || 'Tu proyecto'

            await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: job.user_id,
                type: 'success',
                title: '¡Video generado!',
                body: `Tu video para "${projectName}" está listo para descargar.`,
                href: `/app/upload?project=${job.project_id}`,
              })

            // Send email notification if not already notified
            if (!job.notified_at) {
              try {
                // Get user email
                const { data: userData } = await supabaseAdmin.auth.admin.getUserById(job.user_id)
                const userEmail = userData?.user?.email

                if (userEmail) {
                  await sendCompletionEmail({
                    to: userEmail,
                    projectName,
                    downloadUrl,
                    projectId: job.project_id,
                  })
                }

                await supabaseAdmin
                  .from('generation_jobs')
                  .update({ notified_at: new Date().toISOString() })
                  .eq('id', job.id)
              } catch (emailErr) {
                console.warn(`Email send failed for job ${job.id}:`, emailErr)
              }
            }
          }

          completed++
        } else if (normalizedStatus === 'failed') {
          await supabaseAdmin
            .from('generation_jobs')
            .update({
              status: 'failed',
              current_step: 'failed',
              error: 'La generación falló',
              completed_at: new Date().toISOString(),
            })
            .eq('id', job.id)

          // Update project status
          await supabaseAdmin
            .from('projects')
            .update({ status: 'failed' })
            .eq('id', job.project_id)

          // Create failure notification
          if (job.user_id) {
            const { data: project } = await supabaseAdmin
              .from('projects')
              .select('name')
              .eq('id', job.project_id)
              .single()

            const projectName = project?.name || 'Tu proyecto'

            await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: job.user_id,
                type: 'error',
                title: 'Error en generación',
                body: `La generación del video para "${projectName}" falló. Intenta de nuevo.`,
                href: `/app/upload?project=${job.project_id}`,
              })

            // Send failure email
            if (!job.notified_at) {
              try {
                const { data: userData } = await supabaseAdmin.auth.admin.getUserById(job.user_id)
                const userEmail = userData?.user?.email

                if (userEmail) {
                  await sendFailureEmail({
                    to: userEmail,
                    projectName,
                    projectId: job.project_id,
                  })
                }

                await supabaseAdmin
                  .from('generation_jobs')
                  .update({ notified_at: new Date().toISOString() })
                  .eq('id', job.id)
              } catch (emailErr) {
                console.warn(`Email send failed for job ${job.id}:`, emailErr)
              }
            }
          }

          failed++
        } else {
          // Still processing — update progress estimate
          const elapsedMs = Date.now() - new Date(job.created_at).getTime()
          const estimatedProgress = Math.min(Math.floor(elapsedMs / 60_000) * 5, 90)

          await supabaseAdmin
            .from('generation_jobs')
            .update({
              progress: Math.max(job.progress || 0, estimatedProgress),
              current_step: 'generating',
            })
            .eq('id', job.id)
        }

        processed++
      } catch (pollErr) {
        console.warn(`Error polling job ${job.id}:`, pollErr)
        processed++
      }
    }

    return NextResponse.json({
      message: `Processed ${processed} jobs`,
      processed,
      completed,
      failed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Cron poll failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
