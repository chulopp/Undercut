import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// Routes that are always public (no auth required)
const PUBLIC_ROUTES = ['/', '/login', '/privacy', '/terms']
const PUBLIC_PREFIXES = ['/api/auth/', '/api/billing/webhook/']

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true
  // Static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|gif|woff|woff2|ttf)$/)
  )
    return true
  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Step 1: Always refresh the session (required by @supabase/ssr)
  const { supabaseResponse, user } = await updateSession(request)

  // Step 2: If it's a public route, just return (no gating)
  if (isPublicRoute(pathname)) {
    return supabaseResponse
  }

  // Step 3: Not logged in → redirect to / (landing page)
  if (!user) {
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('auth', 'required')
    return NextResponse.redirect(loginUrl)
  }

  // Step 4: Logged in but onboarding check needed
  // /profile is allowed even without onboarding complete (it IS the onboarding page)
  if (pathname.startsWith('/profile')) {
    return supabaseResponse
  }

  // Step 5: For protected dashboard/billing routes, check onboarding_completed
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/billing')) {
    // Use server client (cookies are already refreshed by updateSession)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // Cookies already set by updateSession
          },
        },
      }
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    if (!profile?.onboarding_completed) {
      return NextResponse.redirect(new URL('/profile', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}