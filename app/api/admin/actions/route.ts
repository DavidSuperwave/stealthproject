import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'

/**
 * POST /api/admin/actions
 *
 * Perform admin actions on a user.
 * Body: { user_id: string, action: 'ban' | 'unban' | 'delete' }
 * Requires admin access.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { user_id, action } = body as { user_id: string; action: 'ban' | 'unban' | 'delete' }

  if (!user_id || !action) {
    return NextResponse.json({ error: 'user_id and action required' }, { status: 400 })
  }

  // Prevent admin from banning/deleting themselves
  if (user_id === user.id) {
    return NextResponse.json({ error: 'No puedes realizar esta acción en tu propia cuenta' }, { status: 400 })
  }

  switch (action) {
    case 'ban': {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: '876000h',
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: 'Usuario baneado' })
    }

    case 'unban': {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: 'none',
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: 'Usuario desbaneado' })
    }

    case 'delete': {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: 'Usuario eliminado' })
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}
