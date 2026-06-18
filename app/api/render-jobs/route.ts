import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getRenderProvider } from '@/lib/render-jobs/providers'
import {
  ensureWorkspaceContext,
  getSupabaseAdmin,
  logUsageEvent,
  recordJobEvent,
  syncMockRenderJob,
  type RenderJobRow,
} from '@/lib/render-jobs/service'

const DEFAULT_MOCK_MODEL = 'mock-video-v1'
const PLATFORM_SCHEMA_MESSAGE =
  'Database migration required. Apply supabase/migrations/004_platform_foundation.sql before using render jobs.'

function isMissingPlatformSchema(error?: { code?: string; message?: string } | null) {
  return (
    error?.code === 'PGRST205' ||
    error?.message?.includes("Could not find the table 'public.render_jobs'") ||
    error?.message?.includes("Could not find the table 'public.workspaces'") ||
    error?.message?.includes("Could not find the table 'public.brands'")
  )
}

function missingPlatformSchemaResponse() {
  return NextResponse.json(
    {
      error: PLATFORM_SCHEMA_MESSAGE,
      setup_required: true,
    },
    { status: 503 },
  )
}

async function validateRenderReferences(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  context: { workspaceId: string; brandId: string },
  campaignId?: string | null,
  scriptId?: string | null,
) {
  let effectiveCampaignId = campaignId ?? null

  if (scriptId) {
    const { data: script, error: scriptErr } = await supabaseAdmin
      .from('content_scripts')
      .select('id, campaign_id, brand_id')
      .eq('id', scriptId)
      .single()

    if (scriptErr || !script) {
      throw new Error('Script not found')
    }

    if (script.brand_id !== context.brandId) {
      throw new Error('Script does not belong to the selected brand')
    }

    if (effectiveCampaignId && script.campaign_id !== effectiveCampaignId) {
      throw new Error('Script does not belong to the selected campaign')
    }

    effectiveCampaignId = script.campaign_id
  }

  if (effectiveCampaignId) {
    const { data: campaign, error: campaignErr } = await supabaseAdmin
      .from('content_campaigns')
      .select('id, workspace_id, brand_id')
      .eq('id', effectiveCampaignId)
      .single()

    if (campaignErr || !campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.workspace_id !== context.workspaceId || campaign.brand_id !== context.brandId) {
      throw new Error('Campaign does not belong to the selected workspace and brand')
    }
  }

  return { campaignId: effectiveCampaignId, scriptId: scriptId ?? null }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limitParam = req.nextUrl.searchParams.get('limit')
    const limit = Math.min(Math.max(Number(limitParam ?? 20), 1), 50)
    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('render_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (isMissingPlatformSchema(error)) {
        return missingPlatformSchemaResponse()
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const jobs = []
    for (const job of (data ?? []) as RenderJobRow[]) {
      jobs.push(await syncMockRenderJob(supabaseAdmin, job))
    }

    return NextResponse.json({ jobs })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const providerName = String(body.provider ?? 'mock')
    const providerModel = String(body.provider_model ?? DEFAULT_MOCK_MODEL)
    const idempotencyKey = req.headers.get('idempotency-key') || body.idempotency_key || null
    const provider = getRenderProvider(providerName)
    const supabaseAdmin = getSupabaseAdmin()

    if (idempotencyKey) {
      const { data: existing, error: existingErr } = await supabaseAdmin
        .from('render_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()

      if (existingErr) {
        if (isMissingPlatformSchema(existingErr)) {
          return missingPlatformSchemaResponse()
        }
        return NextResponse.json({ error: existingErr.message }, { status: 500 })
      }

      if (existing) {
        return NextResponse.json({ job: await syncMockRenderJob(supabaseAdmin, existing) })
      }
    }

    const context = await ensureWorkspaceContext(
      supabaseAdmin,
      user.id,
      body.workspace_id ?? null,
      body.brand_id ?? null,
    )
    const refs = await validateRenderReferences(
      supabaseAdmin,
      context,
      body.campaign_id ?? null,
      body.script_id ?? null,
    )

    const input = {
      ...(body.input ?? {}),
      master_video_asset_id: body.master_video_asset_id ?? null,
      audio_asset_id: body.audio_asset_id ?? null,
      script_id: refs.scriptId,
    }

    const creditsReserved = Number(body.credits_reserved ?? 0)
    const estimatedCostUsd = Number(body.estimated_cost_usd ?? 0)

    const { data: job, error: jobErr } = await supabaseAdmin
      .from('render_jobs')
      .insert({
        workspace_id: context.workspaceId,
        brand_id: context.brandId,
        campaign_id: refs.campaignId,
        script_id: refs.scriptId,
        project_id: body.project_id ?? null,
        user_id: user.id,
        provider: provider.name,
        provider_model: providerModel,
        idempotency_key: idempotencyKey,
        status: 'queued',
        progress: 0,
        input,
        estimated_cost_usd: estimatedCostUsd,
        credits_reserved: creditsReserved,
      })
      .select('*')
      .single()

    if (jobErr || !job) {
      if (isMissingPlatformSchema(jobErr)) {
        return missingPlatformSchemaResponse()
      }
      return NextResponse.json({ error: jobErr?.message || 'Could not create render job' }, { status: 500 })
    }

    await recordJobEvent(supabaseAdmin, job.id, 'job_created', 'Render job created.', {
      provider: provider.name,
      provider_model: providerModel,
    })

    await logUsageEvent(supabaseAdmin, {
      workspaceId: context.workspaceId,
      brandId: context.brandId,
      campaignId: refs.campaignId,
      userId: user.id,
      renderJobId: job.id,
      eventType: 'video_render_queued',
      provider: provider.name,
      model: providerModel,
      credits: creditsReserved,
      estimatedCostUsd,
    })

    try {
      const submit = await provider.submit({
        jobId: job.id,
        providerModel,
        input,
      })

      const terminal = submit.status === 'completed'
      const submittedAt = new Date().toISOString()
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('render_jobs')
        .update({
          provider_request_id: submit.providerRequestId,
          provider_job_id: submit.providerJobId ?? null,
          status: submit.status,
          progress: submit.progress,
          output: submit.output ?? {},
          submitted_at: submittedAt,
          started_at: submittedAt,
          completed_at: terminal ? submittedAt : null,
          credits_captured: terminal ? creditsReserved : null,
          actual_cost_usd: terminal ? estimatedCostUsd : null,
        })
        .eq('id', job.id)
        .select('*')
        .single()

      if (updateErr || !updated) {
        return NextResponse.json({ error: updateErr?.message || 'Could not update render job' }, { status: 500 })
      }

        await recordJobEvent(supabaseAdmin, job.id, 'provider_submit_succeeded', 'Trabajo de video aceptado.', {
        provider_request_id: submit.providerRequestId,
        provider_job_id: submit.providerJobId ?? null,
        status: submit.status,
      })

      if (terminal) {
        await recordJobEvent(supabaseAdmin, job.id, 'provider_completed', 'Video completado.', submit.output ?? {})
        const output = submit.output ?? {}
        const { data: asset } = await supabaseAdmin
          .from('video_assets')
          .insert({
            workspace_id: context.workspaceId,
            brand_id: context.brandId,
            campaign_id: refs.campaignId,
            render_job_id: job.id,
            script_id: refs.scriptId,
            title: 'Video generado de prueba',
            source_url: String(output.video_url ?? ''),
            public_url: String(output.video_url ?? ''),
            provider: provider.name,
            metadata: { provider_model: providerModel },
          })
          .select('id')
          .single()

        await logUsageEvent(supabaseAdmin, {
          workspaceId: context.workspaceId,
          brandId: context.brandId,
          campaignId: refs.campaignId,
          userId: user.id,
          renderJobId: job.id,
          eventType: 'video_render_completed',
          provider: provider.name,
          model: providerModel,
          credits: creditsReserved,
          estimatedCostUsd,
          actualCostUsd: estimatedCostUsd,
          metadata: { asset_id: asset?.id ?? null },
        })
      }

      return NextResponse.json({ job: updated }, { status: 201 })
    } catch (providerErr) {
      const message = providerErr instanceof Error ? providerErr.message : 'No se pudo iniciar la generacion'

      const { data: failed } = await supabaseAdmin
        .from('render_jobs')
        .update({
          status: 'failed',
          progress: 0,
          error_code: 'provider_submit_failed',
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .select('*')
        .single()

      await recordJobEvent(supabaseAdmin, job.id, 'provider_submit_failed', message)

      return NextResponse.json({ error: message, job: failed ?? job }, { status: 502 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
