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

    const { id: tenantId } = await params

    const supabase = createServiceClient()

    // First verify this tenant belongs to a property owned by the landlord
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', user.id)

    const propertyIds = properties?.map(p => p.id) || []

    if (propertyIds.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get units for these properties
    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('property_id', propertyIds)

    const unitIds = units?.map(u => u.id) || []

    // Get lease for this tenant in one of our units
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        tenant_id,
        opening_balance,
        monthly_rent
      `)
      .eq('tenant_id', tenantId)
      .in('unit_id', unitIds)
      .single()

    if (leaseError || !lease) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get all transactions for this lease
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('lease_id', lease.id)
      .order('created_at', { ascending: true })

    if (transactionsError) {
      console.error('Transactions error:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Calculate current balance
    let currentBalance = lease.opening_balance || 0
    ;(transactions || []).forEach(t => {
      if (t.type === 'payment') {
        currentBalance -= t.amount
      } else {
        currentBalance += t.amount
      }
    })

    return NextResponse.json({
      lease: {
        ...lease,
        current_balance: currentBalance
      },
      transactions: transactions || []
    })
  } catch (error) {
    console.error('Tenant transactions API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
