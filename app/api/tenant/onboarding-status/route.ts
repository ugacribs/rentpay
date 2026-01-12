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
    const userEmailLower = user.email?.toLowerCase().trim() || ''
    
    console.log('=== TENANT ONBOARDING STATUS DEBUG ===')
    console.log('User ID:', user.id)
    console.log('User email:', user.email)
    console.log('Looking for lease with email:', userEmailLower)
    
    // First try to find by tenant_email
    let { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        unit:units (
          unit_number,
          property:properties (name)
        )
      `)
      .eq('tenant_email', userEmailLower)
      .in('status', ['pending', 'active'])
      .single()

    console.log('Lease lookup by tenant_email result:', lease ? 'FOUND' : 'NOT FOUND', 'Error:', leaseError?.message)
    
    // If not found by tenant_email, try by tenant_id (for existing tenants)
    if (!lease && tenant) {
      const { data: leaseById, error: leaseByIdError } = await supabase
        .from('leases')
        .select(`
          *,
          unit:units (
            unit_number,
            property:properties (name)
          )
        `)
        .eq('tenant_id', user.id)
        .in('status', ['pending', 'active'])
        .single()
      
      if (leaseById) {
        console.log('Found lease by tenant_id instead')
        lease = leaseById
        leaseError = leaseByIdError
      }
    }
    
    // Debug: List all leases to see what's in the database
    const { data: allLeases } = await supabase
      .from('leases')
      .select('id, tenant_email, tenant_id, status')
      .limit(10)
    console.log('All leases in DB:', JSON.stringify(allLeases, null, 2))

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
