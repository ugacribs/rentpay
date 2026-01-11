import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/auth-helpers'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get all tenants who have leases with this landlord's properties
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select(`
        *,
        lease:leases (
          id,
          status,
          monthly_rent,
          unit:units (
            id,
            unit_number,
            property:properties (
              id,
              name,
              landlord_id
            )
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tenants:', error)
      return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
    }

    // Filter to only tenants whose lease is with this landlord
    const filteredTenants = tenants?.filter(tenant =>
      tenant.lease?.unit?.property?.landlord_id === user.id
    ) || []

    return NextResponse.json(filteredTenants)
  } catch (error) {
    console.error('Tenants API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
