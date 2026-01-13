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

    // Get all leases for these units that have tenant_id
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        id,
        status,
        monthly_rent,
        opening_balance,
        tenant_id,
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
      .not('tenant_id', 'is', null)

    if (leasesError) {
      console.error('Error fetching leases:', leasesError)
      return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
    }

    // Get tenant details for each lease
    const tenantIds = leases?.map(l => l.tenant_id).filter(Boolean) || []
    
    if (tenantIds.length === 0) {
      return NextResponse.json([])
    }

    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .in('id', tenantIds)

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError)
      return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
    }

    // Get all transactions for all leases to calculate balances
    const leaseIds = leases?.map(l => l.id) || []
    const { data: transactions } = await supabase
      .from('transactions')
      .select('lease_id, type, amount')
      .in('lease_id', leaseIds)

    // Calculate balance for each lease
    const leaseBalances: Record<string, number> = {}
    leases?.forEach(lease => {
      const openingBalance = lease.opening_balance || 0
      const leaseTransactions = transactions?.filter(t => t.lease_id === lease.id) || []

      let balance = openingBalance
      leaseTransactions.forEach(t => {
        // Payments are stored as negative amounts, other transactions as positive
        // Simply add all amounts: charges add, payments (negative) subtract
        balance += t.amount
      })
      leaseBalances[lease.id] = balance
    })

    // Combine tenant info with their lease info and balance
    const tenantsWithLeases = tenants?.map(tenant => {
      const lease = leases?.find(l => l.tenant_id === tenant.id)
      return {
        ...tenant,
        lease: lease ? {
          ...lease,
          current_balance: leaseBalances[lease.id] || 0
        } : null
      }
    }) || []

    return NextResponse.json(tenantsWithLeases)
  } catch (error) {
    console.error('Tenants API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
