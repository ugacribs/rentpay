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
      return NextResponse.json({ transactions: [], summary: { totalReceivedThisMonth: 0, totalReceivedAllTime: 0, totalPrepaid: 0, totalPending: 0, aging: { current: 0, days31to60: 0, days61to90: 0, over90: 0 } } })
    }

    // Get all units for these properties
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('property_id', propertyIds)

    const unitIds = units?.map(u => u.id) || []

    if (unitIds.length === 0) {
      return NextResponse.json({ transactions: [], summary: { totalReceivedThisMonth: 0, totalReceivedAllTime: 0, totalPrepaid: 0, totalPending: 0, aging: { current: 0, days31to60: 0, days61to90: 0, over90: 0 } } })
    }

    // Get all leases for these units (include opening_balance and rent_due_date for balance calculation)
    const { data: leases } = await supabase
      .from('leases')
      .select('id, tenant_id, unit_id, opening_balance, status, rent_due_date')
      .in('unit_id', unitIds)

    const leaseIds = leases?.map(l => l.id) || []

    if (leaseIds.length === 0) {
      return NextResponse.json({ transactions: [], summary: { totalReceivedThisMonth: 0, totalReceivedAllTime: 0, totalPrepaid: 0, totalPending: 0, aging: { current: 0, days31to60: 0, days61to90: 0, over90: 0 } } })
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
      .select('id, lease_id, type, amount, transaction_date')
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
    // Total received = sum of all payments (payments are stored as negative, so use Math.abs)
    const allPayments = (allTransactions || []).filter(t => t.type === 'payment')

    const totalReceivedAllTime = allPayments
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)

    // Calculate this month's payments
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const totalReceivedThisMonth = allPayments
      .filter(t => {
        if (!t.transaction_date) return false
        const txDate = new Date(t.transaction_date)
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
      })
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    
    // Calculate total outstanding, prepaid, and aging analysis from all active leases
    let totalOutstanding = 0
    let totalPrepaid = 0
    const activeLeases = (leases || []).filter(l => l.status === 'active')

    // Aging buckets
    const aging = {
      current: 0,      // 0-30 days
      days31to60: 0,   // 31-60 days
      days61to90: 0,   // 61-90 days
      over90: 0,       // 90+ days
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const lease of activeLeases) {
      const leaseTransactions = (allTransactions || []).filter(t => t.lease_id === lease.id)
      let balance = lease.opening_balance || 0

      leaseTransactions.forEach(t => {
        // Payments are stored as negative amounts, other transactions as positive
        // Simply add all amounts: charges add, payments (negative) subtract
        balance += t.amount
      })

      if (balance > 0) {
        totalOutstanding += balance

        // Calculate aging based on oldest unpaid charge
        // Sort transactions by date (oldest first) and find the oldest unpaid charge
        const sortedTransactions = [...leaseTransactions].sort((a, b) =>
          new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        )

        // Track running balance to find when it went positive (unpaid)
        let runningBalance = lease.opening_balance || 0
        let oldestUnpaidDate: Date | null = null

        // If opening balance is positive, that's the oldest unpaid amount
        if (runningBalance > 0) {
          // Use the first transaction date or today as reference
          const firstTx = sortedTransactions[0]
          oldestUnpaidDate = firstTx ? new Date(firstTx.transaction_date) : today
        }

        for (const tx of sortedTransactions) {
          runningBalance += tx.amount
          // When balance goes positive after being zero/negative, mark this as oldest unpaid
          if (runningBalance > 0 && oldestUnpaidDate === null) {
            oldestUnpaidDate = new Date(tx.transaction_date)
          }
          // If balance goes to zero or negative, reset oldest unpaid
          if (runningBalance <= 0) {
            oldestUnpaidDate = null
          }
        }

        // Calculate days overdue
        if (oldestUnpaidDate) {
          const daysOverdue = Math.floor((today.getTime() - oldestUnpaidDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysOverdue <= 30) {
            aging.current += balance
          } else if (daysOverdue <= 60) {
            aging.days31to60 += balance
          } else if (daysOverdue <= 90) {
            aging.days61to90 += balance
          } else {
            aging.over90 += balance
          }
        } else {
          // Default to current if we can't determine
          aging.current += balance
        }
      } else if (balance < 0) {
        // Negative balance means prepaid (credit balance)
        totalPrepaid += Math.abs(balance)
      }
    }

    const summary = {
      totalReceivedThisMonth,
      totalReceivedAllTime,
      totalPrepaid,
      totalPending: totalOutstanding,
      aging,
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
