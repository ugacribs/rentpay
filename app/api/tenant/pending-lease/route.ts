import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser, getTenantData } from '@/lib/auth/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await getTenantData(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const supabase = await createClient()

    // Get pending lease with all details
    const { data: lease, error } = await supabase
      .from('leases')
      .select(`
        *,
        unit:units(
          *,
          property:properties(*)
        )
      `)
      .eq('tenant_id', user.id)
      .eq('status', 'pending')
      .single()

    if (error || !lease) {
      return NextResponse.json(
        { error: 'No pending lease found' },
        { status: 404 }
      )
    }

    // Format lease data
    const leaseData = {
      id: lease.id,
      tenant_name: `${tenant.first_name} ${tenant.last_name}`,
      tenant_email: tenant.email,
      property_name: lease.unit.property.name,
      property_address: lease.unit.property.address,
      unit_number: lease.unit.unit_number,
      monthly_rent: lease.monthly_rent,
      late_fee_amount: lease.late_fee_amount,
      rent_due_date: lease.rent_due_date,
      opening_balance: lease.opening_balance,
    }

    return NextResponse.json(leaseData)
  } catch (error) {
    console.error('Get pending lease error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
