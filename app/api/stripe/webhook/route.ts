import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/api/auth'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

function asId(value: { id?: string } | string | null | undefined) {
  if (!value) return null
  return typeof value === 'string' ? value : value.id || null
}

function assertExpectedMode(livemode: boolean) {
  const key = process.env.STRIPE_SECRET_KEY || ''
  const expectsLive = key.startsWith('sk_live_')

  if (livemode !== expectsLive) {
    throw new Error(`Ignoring ${livemode ? 'live' : 'test'} Stripe event for ${expectsLive ? 'live' : 'test'} key`)
  }
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const admin = getSupabaseAdmin()
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
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook verification failed'
    console.error('Stripe webhook verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    assertExpectedMode(event.livemode)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      default:
        break
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stripe webhook processing failed'
    console.error('Stripe webhook processing failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ received: true })

  async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.payment_status !== 'paid' && session.mode !== 'subscription') {
      throw new Error(`Checkout session ${session.id} is not paid`)
    }

    const userId = session.metadata?.user_id
    if (!userId) throw new Error('Checkout session missing user_id metadata')

    if (session.mode === 'payment') {
      const packageId = session.metadata?.package_id
      if (!packageId) throw new Error('Checkout session missing package_id metadata')

      const { data: pkg, error } = await admin
        .from('credit_packages')
        .select('id, name, credits, active')
        .eq('id', packageId)
        .eq('active', true)
        .single()

      if (error || !pkg) throw new Error(`Credit package ${packageId} is not valid`)

      const metadataCredits = Number(session.metadata?.credits || 0)
      if (metadataCredits !== Number(pkg.credits)) {
        throw new Error('Checkout credit metadata does not match package catalog')
      }

      const { error: rpcError } = await admin.rpc('fulfill_credit_purchase', {
        p_user_id: userId,
        p_amount: Number(pkg.credits),
        p_stripe_session_id: session.id,
        p_package_id: pkg.id,
        p_description: `Compra: ${pkg.name} - ${pkg.credits} creditos`,
        p_stripe_customer_id: asId(session.customer),
        p_metadata: {
          payment_intent: asId(session.payment_intent as string | null),
          amount_total: session.amount_total,
          currency: session.currency,
          livemode: session.livemode
        }
      })

      if (rpcError) throw rpcError
      return
    }

    if (session.mode === 'subscription') {
      const subscriptionId = asId(session.subscription as string | Stripe.Subscription | null)
      const customerId = asId(session.customer)
      const planId = session.metadata?.plan_id

      if (!subscriptionId || !customerId || !planId) {
        throw new Error('Subscription checkout missing customer, subscription, or plan metadata')
      }

      await updateUserSubscription(userId, {
        plan_id: planId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_subscription_status: 'active'
      })
    }
  }

  async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const invoiceAny = invoice as any
    const subscriptionId = asId(invoiceAny.subscription)
    const customerId = asId(invoice.customer)

    if (!subscriptionId || !customerId || invoice.status !== 'paid') return

    const { data: sub, error } = await admin
      .from('user_subscriptions')
      .select('id, user_id, plan_id, subscription_plans(id, name, credits_monthly)')
      .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`)
      .eq('status', 'active')
      .maybeSingle()

    if (error || !sub) throw new Error('Active subscription record not found for paid invoice')

    const plan = Array.isArray(sub.subscription_plans)
      ? sub.subscription_plans[0]
      : sub.subscription_plans

    const credits = Number(plan?.credits_monthly || 0)
    if (!credits) throw new Error('Subscription plan has no monthly credit amount')

    const periodStart = invoiceAny.period_start ? new Date(invoiceAny.period_start * 1000).toISOString() : null
    const periodEnd = invoiceAny.period_end ? new Date(invoiceAny.period_end * 1000).toISOString() : null

    await updateUserSubscription(sub.user_id, {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_subscription_status: 'active',
      current_period_start: periodStart,
      current_period_end: periodEnd
    })

    const { error: rpcError } = await admin.rpc('grant_subscription_invoice_credits', {
      p_user_id: sub.user_id,
      p_amount: credits,
      p_stripe_invoice_id: invoice.id,
      p_stripe_subscription_id: subscriptionId,
      p_description: `Creditos mensuales: ${plan?.name || 'Suscripcion'}`,
      p_metadata: {
        customer: customerId,
        amount_paid: invoiceAny.amount_paid,
        currency: invoice.currency,
        livemode: invoice.livemode,
        period_start: periodStart,
        period_end: periodEnd
      }
    })

    if (rpcError) throw rpcError
  }

  async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const invoiceAny = invoice as any
    const subscriptionId = asId(invoiceAny.subscription)
    const customerId = asId(invoice.customer)

    if (!subscriptionId && !customerId) return

    await updateSubscriptionByStripeIds(customerId, subscriptionId, {
      stripe_subscription_status: 'past_due'
    })
  }

  async function syncSubscription(subscription: Stripe.Subscription) {
    const subscriptionAny = subscription as any
    const userId = subscription.metadata?.user_id
    const planId = subscription.metadata?.plan_id || null
    const customerId = asId(subscription.customer)
    const periodStart = subscriptionAny.current_period_start
      ? new Date(subscriptionAny.current_period_start * 1000).toISOString()
      : null
    const periodEnd = subscriptionAny.current_period_end
      ? new Date(subscriptionAny.current_period_end * 1000).toISOString()
      : null

    if (userId) {
      await updateUserSubscription(userId, {
        plan_id: planId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: subscription.status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end
      })
      return
    }

    await updateSubscriptionByStripeIds(customerId, subscription.id, {
      stripe_subscription_status: subscription.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end
    })
  }

  async function updateUserSubscription(userId: string, values: Record<string, unknown>) {
    const update = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== undefined && value !== null)
    )

    const { error } = await admin
      .from('user_subscriptions')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) throw error
  }

  async function updateSubscriptionByStripeIds(
    customerId: string | null,
    subscriptionId: string | null,
    values: Record<string, unknown>
  ) {
    let query = admin
      .from('user_subscriptions')
      .update({ ...values, updated_at: new Date().toISOString() })

    if (subscriptionId) {
      query = query.eq('stripe_subscription_id', subscriptionId)
    } else if (customerId) {
      query = query.eq('stripe_customer_id', customerId)
    } else {
      return
    }

    const { error } = await query
    if (error) throw error
  }
}
