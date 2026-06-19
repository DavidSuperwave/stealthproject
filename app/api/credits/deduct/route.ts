import { NextRequest, NextResponse } from 'next/server'
import {
  apiErrorResponse,
  assertProjectOwner,
  getIdempotencyKey,
  getSupabaseAdmin,
  requireUser
} from '@/lib/api/auth'

/**
 * POST /api/credits/deduct
 * Body: { project_id?, render_job_id?, generation_job_id?, credits_to_deduct, idempotency_key? }
 */
export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const { user } = await requireUser()
    const body = await req.json()
    const creditsToDeduct = Number(body.credits_to_deduct)

    if (!Number.isFinite(creditsToDeduct) || creditsToDeduct <= 0) {
      return NextResponse.json(
        { error: 'credits_to_deduct must be a positive number' },
        { status: 400 }
      )
    }

    if (body.project_id) {
      await assertProjectOwner(admin, user.id, body.project_id)
    }

    const idempotencyKey = getIdempotencyKey(req, body.idempotency_key)

    const { data, error } = await admin.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: creditsToDeduct,
      p_project_id: body.project_id || null,
      p_render_job_id: body.render_job_id || null,
      p_generation_job_id: body.generation_job_id || null,
      p_idempotency_key: idempotencyKey,
      p_description: `Uso de ${creditsToDeduct} creditos para generacion de video`
    })

    if (error) {
      console.error('Credit deduction RPC failed:', error)
      return NextResponse.json(
        { error: 'Credit ledger migration is required before deducting credits' },
        { status: 503 }
      )
    }

    if (data === null) {
      const { data: sub } = await admin
        .from('user_subscriptions')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          credits_remaining: sub ? Number(sub.credits_remaining) : 0,
          credits_needed: creditsToDeduct
        },
        { status: 402 }
      )
    }

    return NextResponse.json({
      success: true,
      credits_remaining: Number(data)
    })
  } catch (error) {
    return apiErrorResponse(error, 'Credit deduction failed')
  }
}
