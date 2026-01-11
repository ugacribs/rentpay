import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/auth-helpers'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Check if tenant profile exists
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', user.id)
      .single()

    // Find lease by email (auto-link by email) - use case-insensitive matching
    const userEmailLower = user.email?.toLowerCase() || ''
    
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        unit:units (
          unit_number,
          property:properties (name)
        )
      `)
      .ilike('tenant_email', userEmailLower)
      .in('status', ['pending', 'active'])
      .single()

    if (!lease) {
      return NextResponse.json({
        status: 'no_lease',
        message: 'No lease found for this email',
      })
    }

    // Check lease signature
    const { data: signature } = await supabase
      .from('lease_signatures')
      .select('*')
      .eq('lease_id', lease.id)
      .single()

    // Determine onboarding status
    if (!tenant) {
      // Need to create profile
      return NextResponse.json({
        status: 'needs_profile',
        lease: {
          id: lease.id,
          property_name: lease.unit?.property?.name,
          unit_number: lease.unit?.unit_number,
          monthly_rent: lease.monthly_rent,
        },
      })
    }

    // Check if tenant is linked to lease
    if (lease.tenant_id !== user.id) {
      // Link tenant to lease
      await supabase
        .from('leases')
        .update({ tenant_id: user.id })
        .eq('id', lease.id)
    }

    if (lease.rent_due_date === 1 && lease.status === 'pending') {
      // Default due date - needs to select
      return NextResponse.json({
        status: 'needs_due_date',
        lease_id: lease.id,
      })
    }

    if (!signature && lease.status === 'pending') {
      // Needs to sign lease
      return NextResponse.json({
        status: 'needs_signature',
        lease_id: lease.id,
      })
    }

    // Fully onboarded
    return NextResponse.json({
      status: 'complete',
      lease_id: lease.id,
    })
  } catch (error) {
    console.error('Onboarding status error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
