import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leaseId } = await params
    const supabase = createServiceClient()

    // First verify this lease belongs to the landlord
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        unit:units (
          id,
          property:properties (
            id,
            landlord_id
          )
        )
      `)
      .eq('id', leaseId)
      .single()

    if (leaseError || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
    }

    // Verify landlord owns this property
    if (lease.unit?.property?.landlord_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if lease is already terminated
    if (lease.status === 'terminated') {
      return NextResponse.json({ error: 'Lease is already terminated' }, { status: 400 })
    }

    // 1. Update lease status to terminated
    const { error: updateLeaseError } = await supabase
      .from('leases')
      .update({ 
        status: 'terminated',
        updated_at: new Date().toISOString()
      })
      .eq('id', leaseId)

    if (updateLeaseError) {
      console.error('Failed to update lease:', updateLeaseError)
      return NextResponse.json({ error: 'Failed to terminate lease' }, { status: 500 })
    }

    // 2. Update unit status to vacant
    const { error: updateUnitError } = await supabase
      .from('units')
      .update({ 
        status: 'vacant',
        updated_at: new Date().toISOString()
      })
      .eq('id', lease.unit_id)

    if (updateUnitError) {
      console.error('Failed to update unit:', updateUnitError)
      // Don't fail the whole operation, unit status can be fixed manually
    }

    // 3. Archive the tenant (if tenant_id exists)
    if (lease.tenant_id) {
      const { error: updateTenantError } = await supabase
        .from('tenants')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', lease.tenant_id)

      if (updateTenantError) {
        console.error('Failed to archive tenant:', updateTenantError)
        // Don't fail the whole operation
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Lease terminated successfully' 
    })
  } catch (error) {
    console.error('Terminate lease error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
