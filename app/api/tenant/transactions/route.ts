import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant's lease using service client (bypasses RLS)
    const { data: lease, error: leaseError } = await serviceClient
      .from('leases')
      .select('id')
      .eq('tenant_id', user.id)
      .single()

    if (leaseError || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
    }

    // Get all transactions ordered by date (newest first for display, will reverse for ledger)
    const { data: transactions, error: transactionsError } = await serviceClient
      .from('transactions')
      .select('*')
      .eq('lease_id', lease.id)
      .order('created_at', { ascending: false })

    if (transactionsError) {
      console.error('Transactions error:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json(transactions || [])
  } catch (error) {
    console.error('Get transactions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
