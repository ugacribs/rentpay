/**
 * Airtel Money Collection API Integration (Uganda)
 *
 * Documentation: https://developers.airtel.africa/
 *
 * IMPORTANT: This is a placeholder implementation with the correct structure.
 * You need to add your actual credentials in .env.local:
 * - AIRTEL_API_URL
 * - AIRTEL_CLIENT_ID
 * - AIRTEL_CLIENT_SECRET
 * - AIRTEL_API_KEY
 * - AIRTEL_PIN
 */

interface AirtelCollectionRequest {
  reference: string
  subscriber: {
    country: string
    currency: string
    msisdn: string
  }
  transaction: {
    amount: number
    country: string
    currency: string
    id: string
  }
}

interface AirtelCollectionResponse {
  success: boolean
  transactionId?: string
  error?: string
  statusCode?: number
}

/**
 * Get access token for API requests
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${process.env.AIRTEL_API_URL}/auth/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        client_id: process.env.AIRTEL_CLIENT_ID,
        client_secret: process.env.AIRTEL_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    })

    if (!response.ok) {
      console.error('Failed to get Airtel access token')
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Airtel access token error:', error)
    return null
  }
}

/**
 * Authorize KYC for transaction
 * Required before making payment request
 */
async function authorizeKYC(
  accessToken: string,
  phoneNumber: string
): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.AIRTEL_API_URL}/merchant/v1/payments/authorize/kyc`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Country': 'UG',
        'X-Currency': 'UGX',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msisdn: phoneNumber,
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Airtel KYC authorization error:', error)
    return false
  }
}

/**
 * Request payment from customer
 *
 * @param amount Amount in UGX
 * @param phoneNumber Customer phone number (format: 256XXXXXXXXX or 0XXXXXXXXX)
 * @param transactionId Unique transaction ID from your system
 * @param reference Reference/description for the transaction
 */
export async function requestToPayAirtel(
  amount: number,
  phoneNumber: string,
  transactionId: string,
  reference: string = 'Rent Payment'
): Promise<AirtelCollectionResponse> {
  try {
    // Get access token
    const accessToken = await getAccessToken()
    if (!accessToken) {
      return { success: false, error: 'Failed to authenticate with Airtel' }
    }

    // Token is guaranteed to be non-null after the check above
    const token = accessToken!

    // Format phone number (remove country code if present)
    let formattedPhone = phoneNumber.replace(/[^\d]/g, '')
    if (formattedPhone.startsWith('256')) {
      formattedPhone = formattedPhone.substring(3)
    }
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1)
    }

    // Authorize KYC
    const kycAuthorized = await authorizeKYC(token, formattedPhone)
    if (!kycAuthorized) {
      return { success: false, error: 'KYC authorization failed' }
    }

    // Prepare request
    const requestBody: AirtelCollectionRequest = {
      reference,
      subscriber: {
        country: 'UG',
        currency: 'UGX',
        msisdn: formattedPhone,
      },
      transaction: {
        amount: amount,
        country: 'UG',
        currency: 'UGX',
        id: transactionId,
      },
    }

    // Make payment request
    const response = await fetch(`${process.env.AIRTEL_API_URL}/merchant/v1/payments/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Country': 'UG',
        'X-Currency': 'UGX',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Airtel request to pay failed:', errorText)
      return {
        success: false,
        error: 'Payment request failed',
        statusCode: response.status,
      }
    }

    const data = await response.json()

    if (data.status && data.status.code === '200') {
      return {
        success: true,
        transactionId: data.data?.transaction?.id || transactionId,
      }
    } else {
      return {
        success: false,
        error: data.status?.message || 'Payment request failed',
        statusCode: parseInt(data.status?.code || '500'),
      }
    }
  } catch (error) {
    console.error('Airtel request to pay error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

/**
 * Check payment status/query transaction
 *
 * @param transactionId Transaction ID from your system or Airtel's response
 */
export async function checkPaymentStatusAirtel(transactionId: string): Promise<{
  status: 'TS' | 'TIP' | 'TF' | 'TA' | 'TR' // Success | In Progress | Failed | Ambiguous | Reversed
  amount?: number
  currency?: string
  airtelTransactionId?: string
} | null> {
  try {
    const accessToken = await getAccessToken()
    if (!accessToken) {
      return null
    }

    const response = await fetch(
      `${process.env.AIRTEL_API_URL}/standard/v1/payments/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Country': 'UG',
          'X-Currency': 'UGX',
        },
      }
    )

    if (!response.ok) {
      console.error('Failed to check Airtel payment status')
      return null
    }

    const data = await response.json()

    if (data.status && data.status.code === '200') {
      return {
        status: data.data?.transaction?.status || 'TIP',
        amount: data.data?.transaction?.amount,
        currency: data.data?.transaction?.currency,
        airtelTransactionId: data.data?.transaction?.airtel_money_id,
      }
    }

    return null
  } catch (error) {
    console.error('Airtel check status error:', error)
    return null
  }
}

/**
 * Validate phone number format for Airtel Uganda
 * Accepts formats: 0701234567, 256701234567, or 701234567
 * After normalization, should be 9 digits starting with 70 or 75
 */
export function validateAirtelPhoneNumber(phoneNumber: string): boolean {
  // Remove any spaces or special characters
  let cleaned = phoneNumber.replace(/[^\d]/g, '')

  // Remove country code if present
  if (cleaned.startsWith('256')) {
    cleaned = cleaned.substring(3)
  }

  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // Should be 9 digits and start with 70 or 75
  if (cleaned.length !== 9) {
    return false
  }

  const prefix = cleaned.substring(0, 2)
  return ['70', '75'].includes(prefix)
}

/**
 * Format phone number to Airtel API format
 * Converts: 0701234567 → 701234567
 * Converts: +256701234567 → 701234567
 * Converts: 256701234567 → 701234567
 */
export function formatAirtelPhoneNumber(phoneNumber: string): string {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/[^\d]/g, '')

  // Remove country code if present
  if (cleaned.startsWith('256')) {
    cleaned = cleaned.substring(3)
  }

  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  return cleaned
}
