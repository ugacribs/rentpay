import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: propertyId } = await params

    const supabase = createServiceClient()

    // Verify this property belongs to the landlord
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('id', propertyId)
      .eq('landlord_id', user.id)
      .single()

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Get all units for this property
    const { data: units } = await supabase
      .from('units')
      .select('id, unit_number')
      .eq('property_id', propertyId)

    const unitIds = units?.map(u => u.id) || []

    if (unitIds.length === 0) {
      return NextResponse.json({
        property,
        leases: [],
        transactions: [],
        totalOpeningBalance: 0
      })
    }

    // Get all leases for these units with tenant info
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        id,
        opening_balance,
        monthly_rent,
        tenant_id,
        unit_id
      `)
      .in('unit_id', unitIds)
      .not('tenant_id', 'is', null)

    if (leasesError) {
      console.error('Leases error:', leasesError)
      return NextResponse.json({ error: 'Failed to fetch leases' }, { status: 500 })
    }

    const leaseIds = leases?.map(l => l.id) || []

    if (leaseIds.length === 0) {
      return NextResponse.json({
        property,
        leases: [],
        transactions: [],
        totalOpeningBalance: 0
      })
    }

    // Get tenant details
    const tenantIds = leases?.map(l => l.tenant_id).filter(Boolean) || []
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, first_name, last_name')
      .in('id', tenantIds)

    // Create tenant lookup map
    const tenantMap: Record<string, { first_name: string; last_name: string }> = {}
    tenants?.forEach(t => {
      tenantMap[t.id] = { first_name: t.first_name, last_name: t.last_name }
    })

    // Create unit lookup map
    const unitMap: Record<string, string> = {}
    units?.forEach(u => {
      unitMap[u.id] = u.unit_number
    })

    // Create lease lookup map with tenant and unit info
    const leaseMap: Record<string, { tenant_name: string; unit_number: string; opening_balance: number }> = {}
    leases?.forEach(l => {
      const tenant = tenantMap[l.tenant_id]
      leaseMap[l.id] = {
        tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown',
        unit_number: unitMap[l.unit_id] || 'Unknown',
        opening_balance: l.opening_balance || 0
      }
    })

    // Get all transactions for all leases
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .in('lease_id', leaseIds)
      .order('created_at', { ascending: true })

    if (transactionsError) {
      console.error('Transactions error:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Enrich transactions with tenant and unit info
    const enrichedTransactions = (transactions || []).map(tx => ({
      ...tx,
      tenant_name: leaseMap[tx.lease_id]?.tenant_name || 'Unknown',
      unit_number: leaseMap[tx.lease_id]?.unit_number || 'Unknown'
    }))

    // Calculate total opening balance for the property
    const totalOpeningBalance = leases?.reduce((sum, l) => sum + (l.opening_balance || 0), 0) || 0

    return NextResponse.json({
      property,
      leases: leases?.map(l => ({
        ...l,
        tenant_name: leaseMap[l.id]?.tenant_name,
        unit_number: leaseMap[l.id]?.unit_number
      })) || [],
      transactions: enrichedTransactions,
      totalOpeningBalance
    })
  } catch (error) {
    console.error('Property transactions API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
