import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

export async function GET() {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // First get all properties owned by this landlord
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', user.id)

    const propertyIds = properties?.map(p => p.id) || []

    if (propertyIds.length === 0) {
      return NextResponse.json([])
    }

    // Get all units for these properties
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('property_id', propertyIds)

    const unitIds = units?.map(u => u.id) || []

    if (unitIds.length === 0) {
      return NextResponse.json([])
    }

    // Get all leases for these units
    const { data: leases, error } = await supabase
      .from('leases')
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          property:properties (
            id,
            name
          )
        )
      `)
      .in('unit_id', unitIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching leases:', error)
      return NextResponse.json({ error: 'Failed to fetch leases' }, { status: 500 })
    }

    // Add tenant info from the tenants table
    const leasesWithTenants = await Promise.all(
      (leases || []).map(async (lease) => {
        if (lease.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('id, first_name, last_name, email')
            .eq('id', lease.tenant_id)
            .single()
          return { ...lease, tenant }
        }
        return { ...lease, tenant: null }
      })
    )

    return NextResponse.json(leasesWithTenants)
  } catch (error) {
    console.error('Leases API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
