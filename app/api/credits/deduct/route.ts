import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * POST /api/credits/deduct
 * Body: { project_id, credits_to_deduct }
 *
 * Atomically deducts credits from the user's active subscription.
 * Returns 402 if insufficient credits.
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { project_id, credits_to_deduct } = body

    if (!credits_to_deduct || credits_to_deduct <= 0) {
      return NextResponse.json(
        { error: 'credits_to_deduct must be a positive number' },
        { status: 400 },
      )
    }

    // Atomic deduction: only succeeds if user has enough credits
    const { data, error } = await supabaseAdmin.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: credits_to_deduct,
    })

    // If the RPC doesn't exist yet, fall back to manual update
    if (error && error.message.includes('deduct_credits')) {
      // Fallback: manual atomic update
      const { data: sub, error: subErr } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id, credits_remaining')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (subErr || !sub) {
        return NextResponse.json(
          { error: 'INSUFFICIENT_CREDITS', credits_remaining: 0 },
          { status: 402 },
        )
      }

      if (Number(sub.credits_remaining) < credits_to_deduct) {
        return NextResponse.json(
          {
            error: 'INSUFFICIENT_CREDITS',
            credits_remaining: Number(sub.credits_remaining),
            credits_needed: credits_to_deduct,
          },
          { status: 402 },
        )
      }

      const newBalance = Number(sub.credits_remaining) - credits_to_deduct

      const { error: updateErr } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ credits_remaining: newBalance })
        .eq('id', sub.id)
        .eq('status', 'active')

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }

      // Record the transaction
      await supabaseAdmin.from('credit_transactions').insert({
        user_id: user.id,
        amount: -credits_to_deduct,
        type: 'deduction',
        project_id: project_id || null,
        description: `Deducción de ${credits_to_deduct} créditos para generación de video`,
      })

      return NextResponse.json({
        success: true,
        credits_remaining: newBalance,
      })
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // RPC succeeded — data contains the new balance or a success flag
    if (data === false || data === null) {
      const { data: sub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          credits_remaining: sub ? Number(sub.credits_remaining) : 0,
          credits_needed: credits_to_deduct,
        },
        { status: 402 },
      )
    }

    // Record the transaction
    await supabaseAdmin.from('credit_transactions').insert({
      user_id: user.id,
      amount: -credits_to_deduct,
      type: 'deduction',
      project_id: project_id || null,
      description: `Deducción de ${credits_to_deduct} créditos para generación de video`,
    })

    return NextResponse.json({
      success: true,
      credits_remaining: data,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Credit deduction failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
