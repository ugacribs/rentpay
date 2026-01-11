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

    const { data: leases, error } = await supabase
      .from('leases')
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          property:properties (
            id,
            name,
            landlord_id
          )
        ),
        tenant:tenants (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching leases:', error)
      return NextResponse.json({ error: 'Failed to fetch leases' }, { status: 500 })
    }

    // Filter to only leases for this landlord's properties
    const filteredLeases = leases?.filter(lease =>
      lease.unit?.property?.landlord_id === user.id
    ) || []

    return NextResponse.json(filteredLeases)
  } catch (error) {
    console.error('Leases API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
