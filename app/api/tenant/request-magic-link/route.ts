import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const supabase = createServiceClient()

    // Check if a pending or active lease exists for this email
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, status')
      .ilike('tenant_email', normalizedEmail)
      .in('status', ['pending', 'active'])
      .limit(1)
      .single()

    if (leaseError || !lease) {
      return NextResponse.json(
        { error: 'No lease found for this email. Please contact your landlord to create a lease first.' },
        { status: 404 }
      )
    }

    // Lease exists - send magic link
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tenant/auth/callback`

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })

    if (otpError) {
      console.error('Magic link error:', otpError)
      return NextResponse.json(
        { error: 'Failed to send magic link. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Request magic link error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
