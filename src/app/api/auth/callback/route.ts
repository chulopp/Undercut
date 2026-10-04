import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Always redirect to dashboard, onboarding is handled contextually inside the dashboard
      return NextResponse.redirect(`${origin}/dashboard/x`)
    }
  }

  // Redirect to a simple login error page
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
