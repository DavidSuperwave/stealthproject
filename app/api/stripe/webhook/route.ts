import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events.
 * On checkout.session.completed: adds credits to user's subscription.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const supabaseAdmin = getSupabaseAdmin()

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook verification failed'
    console.error('Stripe webhook verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.metadata?.user_id
    const credits = Number(session.metadata?.credits || 0)
    const packageId = session.metadata?.package_id
    const packageName = session.metadata?.package_name || 'Paquete de créditos'

    if (!userId || !credits) {
      console.error('Webhook missing metadata:', session.metadata)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    // Idempotency check: ensure we haven't already processed this session
    const { data: existingTx } = await supabaseAdmin
      .from('credit_transactions')
      .select('id')
      .eq('stripe_session_id', session.id)
      .single()

    if (existingTx) {
      console.log('Webhook already processed for session:', session.id)
      return NextResponse.json({ received: true, already_processed: true })
    }

    // Add credits to user's active subscription
    const { data: sub, error: subErr } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, credits_remaining')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (subErr || !sub) {
      console.error('No active subscription for user:', userId)
      return NextResponse.json({ error: 'No active subscription' }, { status: 500 })
    }

    const newBalance = Number(sub.credits_remaining) + credits

    const { error: updateErr } = await supabaseAdmin
      .from('user_subscriptions')
      .update({ credits_remaining: newBalance })
      .eq('id', sub.id)

    if (updateErr) {
      console.error('Failed to add credits:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Record the transaction with stripe_session_id for idempotency
    await supabaseAdmin.from('credit_transactions').insert({
      user_id: userId,
      amount: credits,
      type: 'purchase',
      stripe_session_id: session.id,
      package_id: packageId || null,
      description: `Compra: ${packageName} — ${credits} créditos`,
    })

    console.log(`Added ${credits} credits to user ${userId}. New balance: ${newBalance}`)
  }

  return NextResponse.json({ received: true })
}
