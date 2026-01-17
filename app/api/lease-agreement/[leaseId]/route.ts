import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUser, getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params

    // Try to get user (could be tenant or landlord)
    const user = await getUser()
    const landlord = await getAuthorizedLandlord()

    if (!user && !landlord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get the lease with all related data
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        unit:units(
          unit_number,
          property:properties(
            name,
            address,
            landlord_id
          )
        )
      `)
      .eq('id', leaseId)
      .single()

    if (leaseError || !lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      )
    }

    // Check authorization - either tenant owns the lease or landlord owns the property
    const isTenant = user && lease.tenant_id === user.id
    const isLandlord = landlord && (lease.unit as any)?.property?.landlord_id === landlord.id

    if (!isTenant && !isLandlord) {
      return NextResponse.json(
        { error: 'You do not have permission to view this agreement' },
        { status: 403 }
      )
    }

    // Get signature data
    const { data: signature } = await supabase
      .from('lease_signatures')
      .select('*')
      .eq('lease_id', leaseId)
      .single()

    // Get tenant details
    let tenantInfo = null
    if (lease.tenant_id) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('first_name, last_name')
        .eq('id', lease.tenant_id)
        .single()
      tenantInfo = tenantData
    }

    return NextResponse.json({
      lease: {
        ...lease,
        tenant_first_name: tenantInfo?.first_name || '',
        tenant_last_name: tenantInfo?.last_name || '',
      },
      signature: signature || null,
      viewer_role: isTenant ? 'tenant' : 'landlord',
    })
  } catch (error) {
    console.error('Get lease agreement error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
