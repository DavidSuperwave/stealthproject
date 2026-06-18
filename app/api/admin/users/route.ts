import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'

/**
 * GET /api/admin/users
 *
 * Returns all users with their profile info and credit balance.
 * Requires admin access.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // List all auth users
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Get all profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url, created_at, onboarding_completed, creator_type, business_type, primary_use_case, target_audience, content_channels, monthly_video_volume, interested_services, onboarding_goals')

  // Get all subscriptions
  const { data: subscriptions } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id, credits_remaining, status')
    .eq('status', 'active')

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  )
  const subMap = new Map(
    (subscriptions ?? []).map((s) => [s.user_id, s])
  )

  const users = authData.users.map((u) => {
    const profile = profileMap.get(u.id)
    const sub = subMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      full_name: profile?.full_name ?? null,
      onboarding_completed: profile?.onboarding_completed ?? false,
      creator_type: profile?.creator_type ?? null,
      business_type: profile?.business_type ?? null,
      primary_use_case: profile?.primary_use_case ?? null,
      target_audience: profile?.target_audience ?? null,
      content_channels: profile?.content_channels ?? [],
      monthly_video_volume: profile?.monthly_video_volume ?? null,
      interested_services: profile?.interested_services ?? [],
      onboarding_goals: profile?.onboarding_goals ?? null,
      created_at: u.created_at,
      credits_remaining: sub ? Number(sub.credits_remaining) : 0,
      banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
      banned_until: u.banned_until ?? null,
    }
  })

  return NextResponse.json({ users })
}
