import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/tenant/onboarding'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful auth - redirect to onboarding
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed - redirect to error page or signup
  return NextResponse.redirect(`${origin}/tenant/signup?error=auth_failed`)
}
