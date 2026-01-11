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

    const { searchParams } = new URL(request.url)
    const leaseId = searchParams.get('leaseId')

    if (!leaseId) {
      return NextResponse.json({ error: 'Lease ID required' }, { status: 400 })
    }

    // Get balance using the database function with service client
    const { data, error } = await serviceClient.rpc('get_lease_balance', {
      lease_uuid: leaseId,
    })

    if (error) {
      console.error('Balance calculation error:', error)
      return NextResponse.json(
        { error: 'Failed to calculate balance' },
        { status: 500 }
      )
    }

    return NextResponse.json({ balance: data || 0 })
  } catch (error) {
    console.error('Get balance error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
