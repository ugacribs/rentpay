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
    const { signature_data } = body

    if (!signature_data) {
      return NextResponse.json(
        { error: 'Signature is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get pending lease (by tenant_id OR by email)
    let lease = null

    const { data: leaseByTenant } = await supabase
      .from('leases')
      .select('*')
      .eq('tenant_id', user.id)
      .eq('status', 'pending')
      .single()

    if (leaseByTenant) {
      lease = leaseByTenant
    } else {
      // Try by email
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

    // Get IP address
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Save tenant signature (upsert to handle re-signing attempts)
    const { error: signatureError } = await supabase
      .from('lease_signatures')
      .upsert({
        lease_id: lease.id,
        signature_data,
        ip_address: ip,
      }, {
        onConflict: 'lease_id'
      })

    if (signatureError) {
      console.error('Signature save error:', signatureError)
      return NextResponse.json(
        { error: `Failed to save signature: ${signatureError.message}` },
        { status: 500 }
      )
    }

    // Update lease status to active and set start date and signed_at
    const { error: updateError } = await supabase
      .from('leases')
      .update({
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        signed_at: new Date().toISOString(),
      })
      .eq('id', lease.id)

    if (updateError) {
      console.error('Lease update error:', updateError)
      return NextResponse.json(
        { error: `Failed to activate lease: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Re-fetch the lease to get the latest rent_due_date (may have been updated during onboarding)
    const { data: updatedLease, error: refetchError } = await supabase
      .from('leases')
      .select('rent_due_date')
      .eq('id', lease.id)
      .single()

    console.log('Sign lease - rent_due_date debug:', {
      leaseId: lease.id,
      originalRentDueDate: lease.rent_due_date,
      updatedRentDueDate: updatedLease?.rent_due_date,
      refetchError: refetchError?.message,
    })

    // Calculate and charge prorated rent
    const signupDate = new Date()
    const { data: proratedAmount } = await supabase
      .rpc('calculate_prorated_rent', {
        p_lease_id: lease.id,
        p_signup_date: signupDate.toISOString().split('T')[0],
      })

    if (proratedAmount && proratedAmount > 0) {
      // Calculate the day before rent due date for description
      // Business logic: Prorated rent covers from signup date to the day BEFORE the first rent due date
      const rentDueDate = updatedLease?.rent_due_date || lease.rent_due_date || 1
      let firstDueDate: Date

      // If signup day >= due date, first due date is in next month
      if (signupDate.getDate() >= rentDueDate) {
        firstDueDate = new Date(signupDate.getFullYear(), signupDate.getMonth() + 1, rentDueDate)
      } else {
        firstDueDate = new Date(signupDate.getFullYear(), signupDate.getMonth(), rentDueDate)
      }

      // Day before due date is the last day of prorated period
      const dayBeforeDueDate = new Date(firstDueDate)
      dayBeforeDueDate.setDate(dayBeforeDueDate.getDate() - 1)

      const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

      // Create prorated rent transaction with detailed description
      await supabase
        .from('transactions')
        .insert({
          lease_id: lease.id,
          type: 'prorated_rent',
          amount: proratedAmount,
          description: `Prorated rent for period ${formatDate(signupDate)} to ${formatDate(dayBeforeDueDate)}`,
          transaction_date: signupDate.toISOString().split('T')[0],
        })

      // Mark prorated rent as charged and set the first billing date
      // The first_billing_date is when monthly rent charges should START (skips first cycle)
      await supabase
        .from('leases')
        .update({ prorated_rent_charged: true })
        .eq('id', lease.id)

      // Set the first billing date (this tells the daily billing to skip the first cycle)
      await supabase.rpc('set_first_billing_date', {
        p_lease_id: lease.id,
        p_signup_date: signupDate.toISOString().split('T')[0],
      })
    }

    return NextResponse.json({
      success: true,
      prorated_rent: proratedAmount,
    })
  } catch (error) {
    console.error('Sign lease error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
