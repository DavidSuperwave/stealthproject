import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup')

  const isPublicPage =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '/roi' ||
    request.nextUrl.pathname.startsWith('/roi/') ||
    request.nextUrl.pathname === '/vsl' ||
    request.nextUrl.pathname.startsWith('/vsl/')

  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  const isAppRoute = request.nextUrl.pathname === '/app' || request.nextUrl.pathname.startsWith('/app/')
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/app/onboarding')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/app/admin')

  // Unauthenticated user trying to access protected route
  if (!user && !isAuthPage && !isPublicPage && !isApiRoute && !request.nextUrl.pathname.startsWith('/auth/callback')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated user trying to access auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    return NextResponse.redirect(url)
  }

  if (user && isAppRoute && !isOnboardingRoute && !isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    if (profile && profile.onboarding_completed === false) {
      const url = request.nextUrl.clone()
      url.pathname = '/app/onboarding'
      return NextResponse.redirect(url)
    }
  }

  // Admin route protection
  if (isAdminRoute) {
    const adminId = process.env.ADMIN_USER_ID ?? ''
    if (!user || !adminId || user.id !== adminId) {
      const url = request.nextUrl.clone()
      url.pathname = '/app'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
