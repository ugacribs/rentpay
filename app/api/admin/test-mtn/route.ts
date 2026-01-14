import { NextRequest, NextResponse } from 'next/server'
import { requestToPayMTN, checkPaymentStatusMTN } from '@/lib/payments/mtn'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * MTN Payment Test Endpoint
 *
 * Tests the full MTN payment flow:
 * 1. Authentication (get access token)
 * 2. Initiate payment request
 * 3. Check payment status
 *
 * Use MTN sandbox test numbers:
 * - 256779000000 - Will auto-approve
 * - 256779000001 - Will auto-reject
 */

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const adminKey = request.headers.get('x-admin-key')
    if (adminKey !== process.env.LANDLORD_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const testPhone = body.phone || '256779000000' // Default to auto-approve test number
    const testAmount = body.amount || 1000 // 1000 UGX

    const results: Record<string, unknown> = {
      step1_auth: null,
      step2_payment_request: null,
      step3_status_check: null,
      step4_database: null,
    }

    // Step 1: Test authentication by initiating a payment (this internally gets access token)
    console.log('Step 1: Testing MTN authentication...')

    const externalId = `test_${Date.now()}`
    const paymentResult = await requestToPayMTN(
      testAmount,
      testPhone,
      externalId,
      'Test Payment',
      'API Test'
    )

    results.step1_auth = paymentResult.success ? 'SUCCESS' : 'FAILED'
    results.step2_payment_request = paymentResult

    if (!paymentResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Payment request failed',
        results,
      })
    }

    // Step 2: Wait a moment then check status
    console.log('Step 2: Waiting 3 seconds then checking payment status...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    const statusResult = await checkPaymentStatusMTN(paymentResult.referenceId!)
    results.step3_status_check = statusResult

    // Step 3: Check if transaction was logged in database
    console.log('Step 3: Checking database for transaction record...')
    const supabase = createServiceClient()

    const { data: dbRecord, error: dbError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('gateway_reference', paymentResult.referenceId)
      .single()

    if (dbError) {
      results.step4_database = {
        status: 'NOT_FOUND',
        note: 'This is expected for direct API tests - transactions are only logged when initiated through the UI',
        error: dbError.message,
      }
    } else {
      results.step4_database = {
        status: 'FOUND',
        record: dbRecord,
      }
    }

    return NextResponse.json({
      success: true,
      message: 'MTN payment flow test completed',
      test_phone: testPhone,
      test_amount: testAmount,
      reference_id: paymentResult.referenceId,
      results,
      callback_info: {
        callback_host: process.env.NEXT_PUBLIC_APP_URL,
        callback_endpoint: '/api/webhooks/mtn',
        note: 'MTN will send callback to this URL when payment status changes',
      },
    })
  } catch (error) {
    console.error('MTN test error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: String(error) },
      { status: 500 }
    )
  }
}

// Info endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: 'test-mtn',
    description: 'Tests MTN payment flow',
    usage: 'POST with header x-admin-key and optional body { phone, amount }',
    test_numbers: {
      auto_approve: '256779000000',
      auto_reject: '256779000001',
    },
  })
}
