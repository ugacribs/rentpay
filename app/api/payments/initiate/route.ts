import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/auth-helpers'
import { requestToPayMTN, validateMTNPhoneNumber, formatMTNPhoneNumber } from '@/lib/payments/mtn'
import { requestToPayAirtel, validateAirtelPhoneNumber, formatAirtelPhoneNumber } from '@/lib/payments/airtel'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, phone_number, gateway } = body

    // Validation
    if (!amount || !phone_number || !gateway) {
      return NextResponse.json(
        { error: 'Amount, phone number, and gateway are required' },
        { status: 400 }
      )
    }

    if (!['mtn', 'airtel'].includes(gateway)) {
      return NextResponse.json(
        { error: 'Invalid gateway. Must be "mtn" or "airtel"' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Normalize phone input: accept 07XXXXXXXX and convert to 256XXXXXXXXX, or accept already-256 format
    const normalizePhone = (input: string) => {
      const digits = (input || '').replace(/\D/g, '')
      if (digits.startsWith('0') && digits.length === 10) return `256${digits.slice(1)}`
      if (digits.startsWith('256') && digits.length === 12) return digits
      return null
    }

    const normalizedPhone = normalizePhone(phone_number)
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Enter phone as 07XXXXXXXX; we will format it automatically.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get tenant's active lease (by tenant_id, or fall back to email and link the lease)
    let lease = null

    const { data: leaseById, error: leaseByIdError } = await supabase
      .from('leases')
      .select('*')
      .eq('tenant_id', user.id)
      .eq('status', 'active')
      .single()

    if (leaseById) {
      lease = leaseById
    }

    if (!lease) {
      const userEmail = (user.email || '').toLowerCase()
      const { data: leaseByEmail } = await supabase
        .from('leases')
        .select('*')
        .ilike('tenant_email', userEmail)
        .eq('status', 'active')
        .single()

      if (leaseByEmail) {
        lease = leaseByEmail
        // Link tenant to lease if not already linked
        if (!leaseByEmail.tenant_id) {
          await supabase
            .from('leases')
            .update({ tenant_id: user.id })
            .eq('id', leaseByEmail.id)
        }
      }
    }

    if (!lease) {
      return NextResponse.json(
        { error: 'No active lease found' },
        { status: 400 }
      )
    }

    // Validate phone number based on gateway
    let isValidPhone = false
    let formattedPhone = ''

    if (gateway === 'mtn') {
      formattedPhone = formatMTNPhoneNumber(normalizedPhone)
      isValidPhone = validateMTNPhoneNumber(formattedPhone)

      if (!isValidPhone) {
        return NextResponse.json(
          { error: 'Invalid MTN phone number. Enter as 07XXXXXXXX; we convert to 256XXXXXXXXX.' },
          { status: 400 }
        )
      }
    } else if (gateway === 'airtel') {
      formattedPhone = formatAirtelPhoneNumber(normalizedPhone)
      isValidPhone = validateAirtelPhoneNumber(formattedPhone)

      if (!isValidPhone) {
        return NextResponse.json(
          { error: 'Invalid Airtel phone number. Enter as 07XXXXXXXX; we convert to 256XXXXXXXXX.' },
          { status: 400 }
        )
      }
    }

    // Generate unique transaction ID
    const transactionId = `RENT-${lease.id.substring(0, 8)}-${Date.now()}`

    // Create payment transaction record
    const { data: paymentTransaction, error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        lease_id: lease.id,
        gateway,
        phone_number: formattedPhone,
        amount,
        status: 'pending',
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment transaction creation error:', paymentError)
      return NextResponse.json(
        { error: 'Failed to create payment transaction' },
        { status: 500 }
      )
    }

    // Initiate payment with gateway
    let paymentResult

    if (gateway === 'mtn') {
      paymentResult = await requestToPayMTN(
        amount,
        formattedPhone,
        transactionId,
        `Rent Payment - ${lease.id.substring(0, 8)}`,
        `Rent payment for lease ${lease.id}`
      )
    } else {
      paymentResult = await requestToPayAirtel(
        amount,
        formattedPhone,
        transactionId,
        `Rent Payment - ${lease.id.substring(0, 8)}`
      )
    }

    if (!paymentResult.success) {
      // Update payment transaction to failed
      await supabase
        .from('payment_transactions')
        .update({ status: 'failed', webhook_data: { error: paymentResult.error } })
        .eq('id', paymentTransaction.id)

      return NextResponse.json(
        { error: paymentResult.error || 'Payment initiation failed' },
        { status: 400 }
      )
    }

    // Update payment transaction with gateway reference
    const gatewayReference = gateway === 'mtn'
      ? (paymentResult as any).referenceId
      : (paymentResult as any).transactionId

    await supabase
      .from('payment_transactions')
      .update({
        gateway_reference: gatewayReference,
        webhook_data: { initiated_at: new Date().toISOString() },
      })
      .eq('id', paymentTransaction.id)

    return NextResponse.json({
      success: true,
      payment_id: paymentTransaction.id,
      gateway_reference: gatewayReference,
      message: `Payment request sent to ${gateway.toUpperCase()}. Please check your phone to complete the transaction.`,
    })
  } catch (error) {
    console.error('Payment initiation error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
