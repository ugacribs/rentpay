import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Airtel Money Webhook Handler
 *
 * This endpoint receives payment notifications from Airtel when a transaction is completed.
 * Airtel will POST to this endpoint with transaction status updates.
 *
 * IMPORTANT: In production, you must:
 * 1. Verify the request is from Airtel (check IP whitelist or signature)
 * 2. Handle duplicate notifications (idempotency)
 * 3. Log all webhook calls for debugging
 */

export async function POST(request: NextRequest) {
  try {
    // TODO: Add webhook signature verification for production
    // const signature = request.headers.get('x-airtel-signature')
    // if (!verifyAirtelSignature(signature, payload)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    // Parse webhook payload
    const payload = await request.json()

    console.log('Airtel Webhook received:', JSON.stringify(payload, null, 2))

    // Extract transaction details
    // Note: Actual payload structure may vary - check Airtel documentation
    const {
      transaction,
    } = payload

    if (!transaction || !transaction.id) {
      return NextResponse.json(
        { error: 'Missing transaction ID' },
        { status: 400 }
      )
    }

    const transactionId = transaction.id
    const status = transaction.status // TS = Success, TF = Failed, etc.
    const amount = transaction.amount
    const airtelMoneyId = transaction.airtel_money_id

    // Use service client - webhooks have no user session
    const supabase = createServiceClient()

    // Find payment transaction by gateway reference
    const { data: payment, error: paymentError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('gateway_reference', transactionId)
      .eq('gateway', 'airtel')
      .single()

    if (paymentError || !payment) {
      console.error('Payment not found for transaction:', transactionId)
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Check if already processed (idempotency)
    if (payment.status === 'completed') {
      console.log('Payment already processed:', transactionId)
      return NextResponse.json({ status: 'already_processed' })
    }

    // Determine new status
    let newStatus: 'pending' | 'completed' | 'failed' = 'pending'

    if (status === 'TS') { // Transaction Successful
      newStatus = 'completed'
    } else if (['TF', 'TR'].includes(status)) { // Failed or Reversed
      newStatus = 'failed'
    }

    // Update payment transaction
    await supabase
      .from('payment_transactions')
      .update({
        status: newStatus,
        webhook_data: {
          ...payment.webhook_data,
          webhook_payload: payload,
          webhook_received_at: new Date().toISOString(),
        },
      })
      .eq('id', payment.id)

    // If successful, create transaction record in ledger
    if (newStatus === 'completed') {
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          lease_id: payment.lease_id,
          type: 'payment',
          amount: -payment.amount, // Negative because it's a payment (credit)
          description: `Payment via Airtel Money (${airtelMoneyId})`,
          transaction_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (!transactionError && transactionData) {
        // Link transaction to payment
        await supabase
          .from('payment_transactions')
          .update({ transaction_id: transactionData.id })
          .eq('id', payment.id)
      }

      // TODO: Send payment confirmation email/notification to tenant
      console.log('Payment completed:', {
        payment_id: payment.id,
        amount: payment.amount,
        lease_id: payment.lease_id,
      })
    }

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Airtel webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    webhook: 'airtel',
    status: 'active',
    timestamp: new Date().toISOString(),
  })
}
