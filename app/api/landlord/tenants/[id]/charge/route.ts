import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: tenantId } = await params
    const body = await request.json()
    const { amount, description, type = 'adjustment' } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
    }

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify this tenant belongs to a property owned by the landlord
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
      .select('id')
      .eq('tenant_id', tenantId)
      .in('unit_id', unitIds)
      .single()

    if (leaseError || !lease) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Create the transaction (charge)
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        lease_id: lease.id,
        type: type, // 'adjustment', 'rent', 'late_fee'
        amount: amount,
        description: description,
        transaction_date: new Date().toISOString().split('T')[0], // Today's date
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction error:', transactionError)
      return NextResponse.json({ error: 'Failed to create charge' }, { status: 500 })
    }

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Add charge API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
