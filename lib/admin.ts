/**
 * Admin access — single-user lockdown.
 *
 * Uses ADMIN_USER_ID (Supabase auth UUID) for server-side authorization.
 * Uses NEXT_PUBLIC_ADMIN_USER_ID for client-side UI visibility only.
 *
 * This restricts admin access to exactly one user.
 */

/** Server-side check — used in API routes and middleware. */
export function isAdmin(userId: string | undefined | null): boolean {
  if (!userId) return false
  const adminId = process.env.ADMIN_USER_ID ?? ''
  if (!adminId) return false
  return userId === adminId
}

/** Client-side check — only controls UI visibility, not actual access. */
export function isAdminClient(userId: string | undefined | null): boolean {
  if (!userId) return false
  const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? ''
  if (!adminId) return false
  return userId === adminId
}
