import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * MTN Mobile Money Webhook Handler
 *
 * This endpoint receives payment notifications from MTN when a transaction is completed.
 * MTN will POST to this endpoint with transaction status updates.
 *
 * IMPORTANT: In production, you must:
 * 1. Verify the request is from MTN (check IP whitelist or signature)
 * 2. Handle duplicate notifications (idempotency)
 * 3. Log all webhook calls for debugging
 */

export async function POST(request: NextRequest) {
  try {
    // Parse webhook payload
    const payload = await request.json()

    console.log('MTN Webhook received:', JSON.stringify(payload, null, 2))

    // Extract transaction details
    // Note: Actual payload structure may vary - check MTN documentation
    const {
      referenceId,
      status,
      amount,
      currency,
      financialTransactionId,
      externalId,
      reason,
    } = payload

    if (!referenceId) {
      return NextResponse.json(
        { error: 'Missing referenceId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find payment transaction by gateway reference
    const { data: payment, error: paymentError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('gateway_reference', referenceId)
      .eq('gateway', 'mtn')
      .single()

    if (paymentError || !payment) {
      console.error('Payment not found for reference:', referenceId)
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Check if already processed (idempotency)
    if (payment.status === 'completed') {
      console.log('Payment already processed:', referenceId)
      return NextResponse.json({ status: 'already_processed' })
    }

    // Determine new status
    let newStatus: 'pending' | 'completed' | 'failed' = 'pending'

    if (status === 'SUCCESSFUL') {
      newStatus = 'completed'
    } else if (status === 'FAILED') {
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
          description: `Payment via MTN Mobile Money (${financialTransactionId})`,
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
    console.error('MTN webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    webhook: 'mtn',
    status: 'active',
    timestamp: new Date().toISOString(),
  })
}
