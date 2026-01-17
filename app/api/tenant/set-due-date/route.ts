import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rent_due_date } = body

    if (!rent_due_date || rent_due_date < 1 || rent_due_date > 31) {
      return NextResponse.json(
        { error: 'Invalid due date' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get tenant's pending lease (by tenant_id OR by email for new flow)
    let lease = null

    // First try by tenant_id
    const { data: leaseByTenant } = await supabase
      .from('leases')
      .select('*')
      .eq('tenant_id', user.id)
      .eq('status', 'pending')
      .single()

    if (leaseByTenant) {
      lease = leaseByTenant
    } else {
      // Try by email (for new invite flow)
      const userEmail = user.email?.toLowerCase() || ''
      const { data: leaseByEmail } = await supabase
        .from('leases')
        .select('*')
        .ilike('tenant_email', userEmail)
        .eq('status', 'pending')
        .single()

      if (leaseByEmail) {
        lease = leaseByEmail
        // Link tenant to lease
        await supabase
          .from('leases')
          .update({ tenant_id: user.id })
          .eq('id', leaseByEmail.id)
      }
    }

    if (!lease) {
      return NextResponse.json(
        { error: 'No pending lease found' },
        { status: 400 }
      )
    }

    // Update lease with due date
    const { error: updateError } = await supabase
      .from('leases')
      .update({ rent_due_date })
      .eq('id', lease.id)

    console.log('Set due date - update result:', {
      leaseId: lease.id,
      newRentDueDate: rent_due_date,
      updateError: updateError?.message,
    })

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update due date' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Set due date error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
