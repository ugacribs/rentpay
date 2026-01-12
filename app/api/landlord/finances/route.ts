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
      return NextResponse.json({ transactions: [], summary: { totalReceived: 0, totalPending: 0, totalOverdue: 0 } })
    }

    // Get all units for these properties
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('property_id', propertyIds)

    const unitIds = units?.map(u => u.id) || []

    if (unitIds.length === 0) {
      return NextResponse.json({ transactions: [], summary: { totalReceived: 0, totalPending: 0, totalOverdue: 0 } })
    }

    // Get all leases for these units (include opening_balance and rent_due_date for balance calculation)
    const { data: leases } = await supabase
      .from('leases')
      .select('id, tenant_id, unit_id, opening_balance, status, rent_due_date')
      .in('unit_id', unitIds)

    const leaseIds = leases?.map(l => l.id) || []

    if (leaseIds.length === 0) {
      return NextResponse.json({ transactions: [], summary: { totalReceived: 0, totalPending: 0, totalOverdue: 0 } })
    }

    // Get all transactions for these leases (for display, limited to 50)
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        lease:leases (
          id,
          unit:units (
            id,
            unit_number,
            property:properties (
              id,
              name
            )
          )
        )
      `)
      .in('lease_id', leaseIds)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Get ALL transactions for accurate totals (no limit)
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('id, lease_id, type, amount')
      .in('lease_id', leaseIds)

    // Get tenant info for each transaction
    const transactionsWithTenants = await Promise.all(
      (transactions || []).map(async (t) => {
        const lease = leases?.find(l => l.id === t.lease_id)
        if (lease?.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('id, first_name, last_name, email')
            .eq('id', lease.tenant_id)
            .single()
          return { ...t, tenant }
        }
        return { ...t, tenant: null }
      })
    )

    // Calculate summary using ALL transactions (not limited)
    // Total received = sum of all payments
    const totalReceived = (allTransactions || [])
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    
    // Calculate total outstanding and overdue from all active leases
    // Balance = opening_balance + charges - payments
    // Overdue = balance that is past the rent_due_date for the current month
    let totalOutstanding = 0
    let totalOverdue = 0
    const activeLeases = (leases || []).filter(l => l.status === 'active')
    
    const today = new Date()
    const currentDay = today.getDate()
    
    for (const lease of activeLeases) {
      const leaseTransactions = (allTransactions || []).filter(t => t.lease_id === lease.id)
      let balance = lease.opening_balance || 0
      
      leaseTransactions.forEach(t => {
        if (t.type === 'payment') {
          balance -= t.amount
        } else {
          balance += t.amount
        }
      })
      
      if (balance > 0) {
        totalOutstanding += balance
        
        // Check if this balance is overdue
        // If rent_due_date is set and today is past that day, the balance is overdue
        const rentDueDate = lease.rent_due_date || 1 // Default to 1st if not set
        if (currentDay > rentDueDate) {
          totalOverdue += balance
        }
      }
    }

    const summary = {
      totalReceived,
      totalPending: totalOutstanding, // Using pending for outstanding balances
      totalOverdue,
    }

    return NextResponse.json({
      transactions: transactionsWithTenants,
      summary,
    })
  } catch (error) {
    console.error('Finances API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
