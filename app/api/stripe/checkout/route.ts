import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  apiErrorResponse,
  getSupabaseAdmin,
  requireUser
} from '@/lib/api/auth'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    const admin = getSupabaseAdmin()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const { user } = await requireUser()
    const body = await req.json()
    const packageId = body.package_id || null
    const planId = body.plan_id || body.subscription_plan_id || null

    if (packageId && planId) {
      return NextResponse.json(
        { error: 'Choose either package_id or plan_id, not both' },
        { status: 400 }
      )
    }

    if (!packageId && !planId) {
      return NextResponse.json(
        { error: 'package_id or plan_id is required' },
        { status: 400 }
      )
    }

    if (packageId) {
      const { data: pkg, error } = await admin
        .from('credit_packages')
        .select('*')
        .eq('id', packageId)
        .eq('active', true)
        .single()

      if (error || !pkg) {
        return NextResponse.json({ error: 'Package not found' }, { status: 404 })
      }

      const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = pkg.stripe_price_id
        ? { price: pkg.stripe_price_id, quantity: 1 }
        : {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: pkg.name,
                description: `${pkg.credits} creditos (${pkg.minutes_equivalent} min de contenido)${pkg.includes_scripts ? ' + Acceso a guiones' : ''}`
              },
              unit_amount: pkg.price_cents_mxn
            },
            quantity: 1
          }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        currency: 'mxn',
        line_items: [lineItem],
        success_url: `${appUrl}/app/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/app/subscription?canceled=true`,
        metadata: {
          checkout_kind: 'credit_package',
          user_id: user.id,
          package_id: pkg.id,
          credits: String(pkg.credits),
          package_name: pkg.name,
          includes_scripts: String(pkg.includes_scripts)
        },
        customer_email: user.email || undefined
      })

      return NextResponse.json({ url: session.url })
    }

    const { data: plan, error } = await admin
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('active', true)
      .single()

    if (error || !plan) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 })
    }

    if (!plan.credits_monthly || !plan.price_cents) {
      return NextResponse.json(
        { error: 'Subscription plan is missing price or credits' },
        { status: 400 }
      )
    }

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = plan.stripe_price_id
      ? { price: plan.stripe_price_id, quantity: 1 }
      : {
          price_data: {
            currency: 'mxn',
            recurring: { interval: 'month' },
            product_data: {
              name: plan.name,
              description: `${plan.credits_monthly} creditos mensuales`
            },
            unit_amount: plan.price_cents
          },
          quantity: 1
        }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [lineItem],
      success_url: `${appUrl}/app/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/app/subscription?canceled=true`,
      metadata: {
        checkout_kind: 'subscription',
        user_id: user.id,
        plan_id: plan.id,
        credits_monthly: String(plan.credits_monthly),
        plan_name: plan.name
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          credits_monthly: String(plan.credits_monthly)
        }
      },
      customer_email: user.email || undefined
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    return apiErrorResponse(error, 'Stripe checkout failed')
  }
}
