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

    // First check if tenant is archived (lease terminated)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('status')
      .eq('id', user.id)
      .single()

    if (tenant?.status === 'archived') {
      return NextResponse.json({ 
        error: 'Your lease has been terminated. Please contact your landlord for more information.',
        code: 'LEASE_TERMINATED'
      }, { status: 403 })
    }

    // Try to get lease by tenant_id first
    let lease = null

    const { data: leaseByTenant } = await supabase
      .from('leases')
      .select(`
        *,
        unit:units(
          *,
          property:properties(*)
        )
      `)
      .eq('tenant_id', user.id)
      .in('status', ['pending', 'active'])
      .single()

    if (leaseByTenant) {
      lease = leaseByTenant
    } else {
      // Try by email (for new invite flow)
      const userEmail = user.email?.toLowerCase() || ''
      const { data: leaseByEmail } = await supabase
        .from('leases')
        .select(`
          *,
          unit:units(
            *,
            property:properties(*)
          )
        `)
        .ilike('tenant_email', userEmail)
        .in('status', ['pending', 'active'])
        .single()

      if (leaseByEmail) {
        lease = leaseByEmail
      }
    }

    if (!lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
    }

    return NextResponse.json(lease)
  } catch (error) {
    console.error('Get lease error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
