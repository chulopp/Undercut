import { auth } from '@/lib/auth'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Step 1: If it's a public route, just return (no auth gating)
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Step 2: Check session via NextAuth
  const session = await auth()

  // Step 3: Not logged in → redirect to / (landing page)
  if (!session?.user?.id) {
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('auth', 'required')
    return NextResponse.redirect(loginUrl)
  }

  // Step 4: /profile is allowed even without onboarding complete (it IS the onboarding page)
  // Step 5: Dashboard/billing routes are freely accessible once logged in.
  // Onboarding is triggered contextually on the client side (first "Generate Draft" click)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}