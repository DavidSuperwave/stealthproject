import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

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
 * POST /api/stripe/checkout
 * Body: { package_id }
 *
 * Creates a Stripe Checkout Session for a one-time credit package purchase in MXN.
 */
export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    const supabaseAdmin = getSupabaseAdmin()
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { package_id } = body

    if (!package_id) {
      return NextResponse.json({ error: 'package_id is required' }, { status: 400 })
    }

    // Fetch the package details
    const { data: pkg, error: pkgErr } = await supabaseAdmin
      .from('credit_packages')
      .select('*')
      .eq('id', package_id)
      .eq('active', true)
      .single()

    if (pkgErr || !pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // Build line item — use stripe_price_id if configured, otherwise create inline price
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = pkg.stripe_price_id
      ? {
          price: pkg.stripe_price_id,
          quantity: 1,
        }
      : {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: pkg.name,
              description: `${pkg.credits} créditos (${pkg.minutes_equivalent} min de contenido)${pkg.includes_scripts ? ' + Acceso a Guiones AI' : ''}`,
            },
            unit_amount: pkg.price_cents_mxn,
          },
          quantity: 1,
        }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'mxn',
      line_items: [lineItem],
      success_url: `${APP_URL}/app/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/app/subscription?canceled=true`,
      metadata: {
        user_id: user.id,
        package_id: pkg.id,
        credits: String(pkg.credits),
        package_name: pkg.name,
        includes_scripts: String(pkg.includes_scripts),
      },
      customer_email: user.email,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe checkout failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
