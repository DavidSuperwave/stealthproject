import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'

/**
 * POST /api/admin/credits
 *
 * Give credits to a user.
 * Body: { user_id: string, amount: number }
 * Requires admin access.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { user_id, amount } = body as { user_id: string; amount: number }

  if (!user_id || !amount || amount <= 0) {
    return NextResponse.json({ error: 'user_id and positive amount required' }, { status: 400 })
  }

  // Get current subscription
  const { data: sub, error: subErr } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, credits_remaining')
    .eq('user_id', user_id)
    .eq('status', 'active')
    .single()

  if (subErr || !sub) {
    return NextResponse.json({ error: 'No active subscription for this user' }, { status: 404 })
  }

  const newBalance = Number(sub.credits_remaining) + amount

  const { error: updateErr } = await supabaseAdmin
    .from('user_subscriptions')
    .update({ credits_remaining: newBalance })
    .eq('id', sub.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Record transaction for audit trail
  await supabaseAdmin.from('credit_transactions').insert({
    user_id,
    amount,
    type: 'admin_grant',
    description: `Admin grant: ${amount} créditos por ${user.email}`,
  })

  return NextResponse.json({ success: true, new_balance: newBalance })
}
