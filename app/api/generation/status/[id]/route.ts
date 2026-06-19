import { NextRequest, NextResponse } from 'next/server'
import {
  apiErrorResponse,
  assertGenerationJobOwner,
  getSupabaseAdmin,
  requireUser
} from '@/lib/api/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getSupabaseAdmin()
    const { user } = await requireUser()
    const { id } = await params
    const job = await assertGenerationJobOwner(admin, user.id, id)

    return NextResponse.json({ job })
  } catch (error) {
    return apiErrorResponse(error, 'Generation status lookup failed')
  }
}
