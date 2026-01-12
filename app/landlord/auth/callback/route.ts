import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  
  // Use request origin for redirects (works for both localhost and production)
  const baseUrl = origin

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
            // Handle cookie setting errors in edge cases
            console.error('Error setting cookies:', error)
          }
        },
      },
    }
  )

  // Helper function to check if email is authorized landlord
  const isAuthorizedLandlord = (email: string | null | undefined): boolean => {
    if (!email) return false
    const landlordEmail = process.env.LANDLORD_EMAIL?.toLowerCase()
    if (!landlordEmail) return false
    return email.toLowerCase() === landlordEmail
  }

  // Handle PKCE flow (code parameter)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user is authorized landlord
      const { data: { user } } = await supabase.auth.getUser()
      if (!isAuthorizedLandlord(user?.email)) {
        // Sign out unauthorized user
        await supabase.auth.signOut()
        return NextResponse.redirect(`${baseUrl}/landlord/login?error=unauthorized`)
      }
      return NextResponse.redirect(`${baseUrl}/landlord/dashboard`)
    }
    console.error('Landlord auth callback error (code):', error)
  }
  
  // Handle magic link flow (token_hash parameter)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'signup' | 'magiclink',
    })
    if (!error) {
      // Check if user is authorized landlord
      const { data: { user } } = await supabase.auth.getUser()
      if (!isAuthorizedLandlord(user?.email)) {
        // Sign out unauthorized user
        await supabase.auth.signOut()
        return NextResponse.redirect(`${baseUrl}/landlord/login?error=unauthorized`)
      }
      return NextResponse.redirect(`${baseUrl}/landlord/dashboard`)
    }
    console.error('Landlord auth callback error (token_hash):', error)
  }

  // Auth failed - redirect to landlord login
  return NextResponse.redirect(`${baseUrl}/landlord/login?error=auth_failed`)
}
