import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next')
  
  // Use request origin for redirects (works for both localhost and production)
  const baseUrl = origin
  
  // Determine redirect destination
  let redirectTo = next || '/tenant/onboarding'

  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            console.error('Error setting cookies:', error)
          }
        },
      },
    }
  )

  // Handle PKCE flow (code parameter)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${redirectTo}`)
    }
    console.error('Auth callback error (code):', error)
  }
  
  // Handle magic link flow (token_hash parameter)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'signup' | 'magiclink',
    })
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${redirectTo}`)
    }
    console.error('Auth callback error (token_hash):', error)
  }

  // Auth failed - redirect to error page
  return NextResponse.redirect(`${baseUrl}/tenant/signup?error=auth_failed`)
}
