import { NextRequest, NextResponse } from 'next/server'
import {
  apiErrorResponse,
  assertGenerationJobOwner,
  assertRenderJobOwner,
  getIdempotencyKey,
  getSupabaseAdmin,
  requireUser
} from '@/lib/api/auth'

const REFUNDABLE_STATUSES = new Set(['failed', 'cancelled'])

/**
 * POST /api/credits/refund
 * Body: { render_job_id? | generation_job_id?, idempotency_key?, reason? }
 */
export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const { user } = await requireUser()
    const body = await req.json()

    if (!body.render_job_id && !body.generation_job_id) {
      return NextResponse.json(
        { error: 'A failed render_job_id or generation_job_id is required' },
        { status: 400 }
      )
    }

    let amount = 0
    let projectId: string | null = null

    if (body.render_job_id) {
      const job = await assertRenderJobOwner(admin, user.id, body.render_job_id)
      if (!REFUNDABLE_STATUSES.has(String(job.status))) {
        return NextResponse.json({ error: 'Render job is not refundable' }, { status: 409 })
      }
      amount = Number(job.credits_reserved || 0)
      projectId = job.project_id || null
    }

    if (body.generation_job_id) {
      const job = await assertGenerationJobOwner(admin, user.id, body.generation_job_id)
      if (!REFUNDABLE_STATUSES.has(String(job.status))) {
        return NextResponse.json({ error: 'Generation job is not refundable' }, { status: 409 })
      }
      amount = Number(job.credits_reserved || body.amount || 0)
      projectId = job.project_id || projectId
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'No reserved credits were found for this failed job' },
        { status: 409 }
      )
    }

    const { data, error } = await admin.rpc('refund_failed_generation', {
      p_user_id: user.id,
      p_amount: amount,
      p_project_id: projectId,
      p_render_job_id: body.render_job_id || null,
      p_generation_job_id: body.generation_job_id || null,
      p_reason: body.reason || 'Reembolso por generacion fallida',
      p_idempotency_key: getIdempotencyKey(req, body.idempotency_key)
    })

    if (error) {
      console.error('Credit refund RPC failed:', error)
      return NextResponse.json(
        { error: 'Credit ledger migration is required before refunding credits' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      credits_remaining: Number(data)
    })
  } catch (error) {
    return apiErrorResponse(error, 'Credit refund failed')
  }
}
