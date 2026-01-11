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

    // Get all transactions for this landlord's properties
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        lease:leases (
          id,
          tenant:tenants (
            id,
            first_name,
            last_name
          ),
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
      .limit(50)

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Filter to only transactions for this landlord's properties
    const filteredTransactions = transactions?.filter(t =>
      t.lease?.unit?.property?.landlord_id === user.id
    ) || []

    // Calculate summary
    const summary = {
      totalReceived: filteredTransactions
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + (t.amount || 0), 0),
      totalPending: 0, // Would need balance calculation per lease
      totalOverdue: 0, // Would need to check late payments
    }

    return NextResponse.json({
      transactions: filteredTransactions.map(t => ({
        ...t,
        tenant: t.lease?.tenant,
      })),
      summary,
    })
  } catch (error) {
    console.error('Finances API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
