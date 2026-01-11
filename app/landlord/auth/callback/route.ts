import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Landlord callback - always redirect to landlord dashboard
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}/landlord/dashboard`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}/landlord/dashboard`)
      } else {
        return NextResponse.redirect(`${origin}/landlord/dashboard`)
      }
    }
    
    console.error('Landlord auth callback error:', error)
  }

  // Auth failed - redirect to landlord login
  return NextResponse.redirect(`${origin}/landlord/login?error=auth_failed`)
}
