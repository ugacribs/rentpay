import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, firstName, lastName, accessCode } = body

    if (!email || !firstName || !lastName || !accessCode) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Normalize emails to lowercase for comparison
    const normalizedEmail = email.toLowerCase().trim()
    const userEmailNormalized = (user.email || '').toLowerCase().trim()

    if (userEmailNormalized !== normalizedEmail) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify access code - use case-insensitive email matching
    const { data: accessCodeData, error: codeError } = await supabase
      .from('access_codes')
      .select('*, lease:leases(*)')
      .eq('code', accessCode)
      .ilike('email', normalizedEmail)
      .eq('used', false)
      .single()

    if (codeError || !accessCodeData) {
      return NextResponse.json(
        { error: 'Invalid or expired access code' },
        { status: 400 }
      )
    }

    // Check if access code is expired
    if (new Date(accessCodeData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Access code has expired' },
        { status: 400 }
      )
    }

    // Create tenant record with normalized email
    const { error: tenantError } = await supabase
      .from('tenants')
      .insert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: normalizedEmail,
        status: 'active',
      })

    if (tenantError) {
      return NextResponse.json(
        { error: 'Failed to create tenant profile' },
        { status: 500 }
      )
    }

    // Update lease with tenant_id
    const { error: leaseUpdateError } = await supabase
      .from('leases')
      .update({ tenant_id: user.id })
      .eq('id', accessCodeData.lease_id)

    if (leaseUpdateError) {
      return NextResponse.json(
        { error: 'Failed to link tenant to lease' },
        { status: 500 }
      )
    }

    // Mark access code as used
    await supabase
      .from('access_codes')
      .update({ used: true })
      .eq('id', accessCodeData.id)

    return NextResponse.json({
      success: true,
      lease_id: accessCodeData.lease_id,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
