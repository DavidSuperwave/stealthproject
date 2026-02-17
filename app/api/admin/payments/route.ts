import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'

/**
 * GET /api/admin/payments
 *
 * Returns recent credit purchase transactions.
 * Requires admin access.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Fetch recent transactions (all types for full picture)
  const { data: transactions, error } = await supabaseAdmin
    .from('credit_transactions')
    .select('id, user_id, amount, type, stripe_session_id, package_id, description, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get profiles for user emails
  const userIds = Array.from(new Set((transactions ?? []).map((t) => t.user_id)))

  const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? ''])
  )

  // Get credit packages for price info
  const { data: packages } = await supabaseAdmin
    .from('credit_packages')
    .select('id, name, price_cents_mxn, credits')

  const packageMap = new Map(
    (packages ?? []).map((p) => [p.id, p])
  )

  const payments = (transactions ?? []).map((t) => {
    const pkg = t.package_id ? packageMap.get(t.package_id) : null
    return {
      id: t.id,
      user_id: t.user_id,
      user_email: emailMap.get(t.user_id) ?? '—',
      amount: Number(t.amount),
      type: t.type,
      description: t.description,
      package_name: pkg?.name ?? null,
      price_mxn: pkg ? pkg.price_cents_mxn / 100 : null,
      created_at: t.created_at,
    }
  })

  return NextResponse.json({ payments })
}
