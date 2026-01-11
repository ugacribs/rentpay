import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/auth-helpers'
import { checkPaymentStatusMTN } from '@/lib/payments/mtn'
import { checkPaymentStatusAirtel } from '@/lib/payments/airtel'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: paymentId } = await params
    const supabase = await createClient()

    // Get payment transaction
    const { data: payment, error: paymentError } = await supabase
      .from('payment_transactions')
      .select('*, lease:leases(tenant_id)')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (payment.lease.tenant_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // If already completed or failed, return current status
    if (payment.status === 'completed' || payment.status === 'failed') {
      return NextResponse.json({
        status: payment.status,
        amount: payment.amount,
        gateway: payment.gateway,
      })
    }

    // Check status with gateway
    if (!payment.gateway_reference) {
      return NextResponse.json({
        status: 'pending',
        message: 'Payment is being processed',
      })
    }

    let gatewayStatus

    if (payment.gateway === 'mtn') {
      gatewayStatus = await checkPaymentStatusMTN(payment.gateway_reference)
    } else if (payment.gateway === 'airtel') {
      gatewayStatus = await checkPaymentStatusAirtel(payment.gateway_reference)
    }

    if (!gatewayStatus) {
      return NextResponse.json({
        status: 'pending',
        message: 'Unable to check payment status',
      })
    }

    // Update payment status based on gateway response
    let newStatus: 'pending' | 'completed' | 'failed' = 'pending'

    if (payment.gateway === 'mtn') {
      if (gatewayStatus.status === 'SUCCESSFUL') {
        newStatus = 'completed'
      } else if (gatewayStatus.status === 'FAILED') {
        newStatus = 'failed'
      }
    } else if (payment.gateway === 'airtel') {
      if (gatewayStatus.status === 'TS') { // Transaction Successful
        newStatus = 'completed'
      } else if (['TF', 'TR'].includes(gatewayStatus.status)) { // Failed or Reversed
        newStatus = 'failed'
      }
    }

    // If payment is completed, create transaction record
    if (newStatus === 'completed' && payment.status !== 'completed') {
      // Create payment transaction in ledger
      await supabase
        .from('transactions')
        .insert({
          lease_id: payment.lease_id,
          type: 'payment',
          amount: -payment.amount, // Negative because it's a payment (credit)
          description: `Payment via ${payment.gateway.toUpperCase()} Mobile Money`,
          transaction_date: new Date().toISOString().split('T')[0],
        })

      // Link transaction to payment
      const { data: transactionData } = await supabase
        .from('transactions')
        .select('id')
        .eq('lease_id', payment.lease_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      await supabase
        .from('payment_transactions')
        .update({
          status: newStatus,
          transaction_id: transactionData?.id,
          webhook_data: {
            ...payment.webhook_data,
            gateway_status: gatewayStatus,
            completed_at: new Date().toISOString(),
          },
        })
        .eq('id', payment.id)
    } else if (newStatus !== 'pending') {
      // Update payment status
      await supabase
        .from('payment_transactions')
        .update({
          status: newStatus,
          webhook_data: {
            ...payment.webhook_data,
            gateway_status: gatewayStatus,
            updated_at: new Date().toISOString(),
          },
        })
        .eq('id', payment.id)
    }

    return NextResponse.json({
      status: newStatus,
      amount: payment.amount,
      gateway: payment.gateway,
      gateway_status: gatewayStatus,
    })
  } catch (error) {
    console.error('Payment status check error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
