import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if user is a tenant
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('email', user.email)
          .single()

        if (tenant) {
          // Redirect tenant to their dashboard
          return NextResponse.redirect(new URL('/tenant/dashboard', request.url))
        }

        // Check if user is a landlord (has properties)
        const { data: property } = await supabase
          .from('properties')
          .select('id')
          .eq('landlord_id', user.id)
          .single()

        if (property) {
          // Redirect landlord to their dashboard
          return NextResponse.redirect(new URL('/landlord/dashboard', request.url))
        }
      }
    }
  }

  // Default redirect if no role found or error occurred
  return NextResponse.redirect(new URL(next, request.url))
}
