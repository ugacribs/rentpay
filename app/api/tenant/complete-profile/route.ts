import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName } = body

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Check if tenant already exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingTenant) {
      return NextResponse.json({
        success: true,
        message: 'Profile already exists',
      })
    }

    // Create tenant record
    const { error: tenantError } = await supabase
      .from('tenants')
      .insert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        status: 'active',
      })

    if (tenantError) {
      console.error('Tenant creation error:', tenantError)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    // Find and link lease by email
    const userEmail = user.email?.toLowerCase() || ''
    const { data: lease } = await supabase
      .from('leases')
      .select('id')
      .ilike('tenant_email', userEmail)
      .eq('status', 'pending')
      .single()

    if (lease) {
      // Link tenant to lease
      await supabase
        .from('leases')
        .update({ tenant_id: user.id })
        .eq('id', lease.id)

      // Mark access code as used (if exists)
      await supabase
        .from('access_codes')
        .update({ used: true })
        .eq('email', user.email)
        .eq('used', false)
    }

    return NextResponse.json({
      success: true,
      lease_id: lease?.id,
    })
  } catch (error) {
    console.error('Complete profile error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
