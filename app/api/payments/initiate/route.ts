import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()

    // Get tenant's active lease
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('*')
      .eq('tenant_id', user.id)
      .eq('status', 'active')
      .single()

    if (leaseError || !lease) {
      return NextResponse.json(
        { error: 'No active lease found' },
        { status: 400 }
      )
    }

    // Validate phone number based on gateway
    let isValidPhone = false
    let formattedPhone = ''

    if (gateway === 'mtn') {
      formattedPhone = formatMTNPhoneNumber(phone_number)
      isValidPhone = validateMTNPhoneNumber(formattedPhone)

      if (!isValidPhone) {
        return NextResponse.json(
          { error: 'Invalid MTN phone number. Must be in format: 0771234567 or 256771234567' },
          { status: 400 }
        )
      }
    } else if (gateway === 'airtel') {
      formattedPhone = formatAirtelPhoneNumber(phone_number)
      isValidPhone = validateAirtelPhoneNumber(formattedPhone)

      if (!isValidPhone) {
        return NextResponse.json(
          { error: 'Invalid Airtel phone number. Must be in format: 0701234567 or 256701234567' },
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
