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
 * POST /api/credits/refund
 * Body: { amount, project_id?, reason? }
 *
 * Refunds credits back to user's subscription (e.g. after failed generation).
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
    const { amount, project_id, reason } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number' },
        { status: 400 },
      )
    }

    // Add credits back to the active subscription
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, credits_remaining')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (subErr || !sub) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 },
      )
    }

    const newBalance = Number(sub.credits_remaining) + amount

    const { error: updateErr } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ credits_remaining: newBalance })
      .eq('id', sub.id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Record refund transaction
    await supabaseAdmin.from('credit_transactions').insert({
      user_id: user.id,
      amount: amount,
      type: 'refund',
      project_id: project_id || null,
      description: reason || `Reembolso de ${amount} créditos`,
    })

    return NextResponse.json({
      success: true,
      credits_remaining: newBalance,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Credit refund failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
