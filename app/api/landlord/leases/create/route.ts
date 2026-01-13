import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

import { randomBytes } from 'crypto'

// Generate a cryptographically secure 8-character alphanumeric access code
function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = randomBytes(8)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(bytes[i] % chars.length)
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { unitId, tenantEmail: rawTenantEmail, monthlyRent, lateFeeAmount, openingBalance } = body
    
    // Normalize email to lowercase for consistent matching
    const tenantEmail = rawTenantEmail?.toLowerCase().trim()

    // Validation
    if (!unitId || !tenantEmail || !monthlyRent || !lateFeeAmount) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Use service client for admin operations (bypasses RLS)
    const supabase = createServiceClient()

    // Verify the unit belongs to the landlord and is vacant
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('*, property:properties(landlord_id, name)')
      .eq('id', unitId)
      .single()

    if (unitError) {
      console.error('Unit fetch error:', unitError)
      return NextResponse.json(
        { error: 'Failed to fetch unit details' },
        { status: 500 }
      )
    }

    if (!unit) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      )
    }

    // Manually verify ownership since we're using service client
    if (unit.property?.landlord_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this unit' },
        { status: 403 }
      )
    }

    if (unit.status !== 'vacant') {
      return NextResponse.json(
        { error: 'Unit is not vacant' },
        { status: 400 }
      )
    }

    // Create the lease (rent_due_date will be set by tenant during onboarding)
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .insert({
        unit_id: unitId,
        tenant_email: tenantEmail,
        monthly_rent: monthlyRent,
        late_fee_amount: lateFeeAmount,
        opening_balance: openingBalance || 0,
        rent_due_date: 1, // Default to 1st, tenant will update during onboarding
        status: 'pending',
      })
      .select()
      .single()

    if (leaseError) {
      console.error('Lease creation error:', leaseError)
      return NextResponse.json(
        { error: `Failed to create lease: ${leaseError.message}` },
        { status: 500 }
      )
    }

    // Generate access code locally
    const accessCode = generateAccessCode()

    // Create access code record
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days expiry

    const { error: accessCodeError } = await supabase
      .from('access_codes')
      .insert({
        code: accessCode,
        lease_id: lease.id,
        email: tenantEmail,
        expires_at: expiresAt.toISOString(),
      })

    if (accessCodeError) {
      console.error('Access code creation error:', accessCodeError)
      // Rollback lease creation
      await supabase.from('leases').delete().eq('id', lease.id)
      return NextResponse.json(
        { error: `Failed to create access code: ${accessCodeError.message}` },
        { status: 500 }
      )
    }

    // Send invite email to tenant using Supabase Auth
    // When tenant clicks the link, they'll be redirected to onboarding after auth
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/tenant/onboarding`

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      tenantEmail,
      {
        redirectTo: redirectUrl,
        data: {
          access_code: accessCode,
          property_name: unit.property?.name,
          unit_number: unit.unit_number,
          role: 'tenant',
        },
      }
    )

    // Log but don't fail if email fails - landlord can still share code manually
    if (inviteError) {
      console.error('Email invite error:', inviteError)
    }

    return NextResponse.json({
      success: true,
      lease,
      accessCode: accessCode,
      emailSent: !inviteError,
      message: inviteError
        ? `Lease created successfully. Access code: ${accessCode}. Email failed to send - please share this code with the tenant manually.`
        : `Lease created successfully. An invite email has been sent to ${tenantEmail} with the access code.`,
    })
  } catch (error) {
    console.error('Create lease error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
