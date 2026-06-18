import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureWorkspaceContext, getSupabaseAdmin } from '@/lib/render-jobs/service'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const context = await ensureWorkspaceContext(supabaseAdmin, user.id)
    const { data: campaigns, error: campaignsErr } = await supabaseAdmin
      .from('content_campaigns')
      .select('id, name, objective, platform, status, brief, created_at, updated_at')
      .eq('workspace_id', context.workspaceId)
      .order('updated_at', { ascending: false })

    if (campaignsErr) {
      return NextResponse.json({ error: campaignsErr.message }, { status: 500 })
    }

    const campaignIds = (campaigns ?? []).map((campaign) => campaign.id)
    const [scriptsResult, assetsResult, jobsResult] = await Promise.all([
      campaignIds.length
        ? supabaseAdmin
            .from('content_scripts')
            .select('id, campaign_id, title, full_script, duration_target_sec, status, caption_text, created_at, updated_at')
            .in('campaign_id', campaignIds)
            .order('updated_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin
        .from('video_assets')
        .select('id, campaign_id, render_job_id, script_id, title, source_url, public_url, duration_sec, content_type, file_size, status, metadata, created_at')
        .eq('workspace_id', context.workspaceId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('render_jobs')
        .select('id, campaign_id, script_id, status, progress, input, output, credits_reserved, error_message, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50),
    ])

    if (scriptsResult.error) {
      return NextResponse.json({ error: scriptsResult.error.message }, { status: 500 })
    }
    if (assetsResult.error) {
      return NextResponse.json({ error: assetsResult.error.message }, { status: 500 })
    }
    if (jobsResult.error) {
      return NextResponse.json({ error: jobsResult.error.message }, { status: 500 })
    }

    return NextResponse.json({
      campaigns: campaigns ?? [],
      scripts: scriptsResult.data ?? [],
      assets: assetsResult.data ?? [],
      jobs: jobsResult.data ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo cargar la biblioteca'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
