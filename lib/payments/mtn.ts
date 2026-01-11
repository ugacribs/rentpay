/**
 * MTN Mobile Money Collection API Integration (Uganda)
 *
 * Documentation: https://momodeveloper.mtn.com/
 *
 * IMPORTANT: This is a placeholder implementation with the correct structure.
 * You need to add your actual credentials in .env.local:
 * - MTN_API_URL
 * - MTN_COLLECTION_USER_ID
 * - MTN_COLLECTION_API_KEY
 * - MTN_COLLECTION_PRIMARY_KEY
 */

interface MTNCollectionRequest {
  amount: string
  currency: string
  externalId: string
  payer: {
    partyIdType: string
    partyId: string
  }
  payerMessage: string
  payeeNote: string
}

interface MTNCollectionResponse {
  success: boolean
  referenceId?: string
  error?: string
  statusCode?: number
}

/**
 * Generate API User and API Key (One-time setup)
 * This should be done once during initial setup
 */
export async function createMTNApiUser(): Promise<{ userId: string; apiKey: string } | null> {
  try {
    // Step 1: Create API User
    const userId = crypto.randomUUID()
    const createUserResponse = await fetch(`${process.env.MTN_API_URL}/v1_0/apiuser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.MTN_COLLECTION_PRIMARY_KEY!,
        'X-Reference-Id': userId,
      },
      body: JSON.stringify({
        providerCallbackHost: process.env.NEXT_PUBLIC_APP_URL,
      }),
    })

    if (!createUserResponse.ok) {
      console.error('Failed to create MTN API user')
      return null
    }

    // Step 2: Create API Key
    const createKeyResponse = await fetch(`${process.env.MTN_API_URL}/v1_0/apiuser/${userId}/apikey`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.MTN_COLLECTION_PRIMARY_KEY!,
      },
    })

    const keyData = await createKeyResponse.json()
    return {
      userId,
      apiKey: keyData.apiKey,
    }
  } catch (error) {
    console.error('MTN API user creation error:', error)
    return null
  }
}

/**
 * Get access token for API requests
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const credentials = Buffer.from(
      `${process.env.MTN_COLLECTION_USER_ID}:${process.env.MTN_COLLECTION_API_KEY}`
    ).toString('base64')

    const response = await fetch(`${process.env.MTN_API_URL}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': process.env.MTN_COLLECTION_PRIMARY_KEY!,
      },
    })

    if (!response.ok) {
      console.error('Failed to get MTN access token')
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('MTN access token error:', error)
    return null
  }
}

/**
 * Request payment from customer
 *
 * @param amount Amount in UGX
 * @param phoneNumber Customer phone number (format: 256XXXXXXXXX)
 * @param externalId Unique transaction ID from your system
 * @param payerMessage Message shown to payer
 * @param payeeNote Internal note
 */
export async function requestToPayMTN(
  amount: number,
  phoneNumber: string,
  externalId: string,
  payerMessage: string = 'Rent Payment',
  payeeNote: string = 'Rent Payment'
): Promise<MTNCollectionResponse> {
  try {
    // Get access token
    const accessToken = await getAccessToken()
    if (!accessToken) {
      return { success: false, error: 'Failed to authenticate with MTN' }
    }

    // Generate reference ID for this transaction
    const referenceId = crypto.randomUUID()

    // Prepare request
    const requestBody: MTNCollectionRequest = {
      amount: amount.toString(),
      currency: 'UGX',
      externalId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: phoneNumber, // Format: 256XXXXXXXXX
      },
      payerMessage,
      payeeNote,
    }

    // Make request
    const response = await fetch(`${process.env.MTN_API_URL}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
        'Ocp-Apim-Subscription-Key': process.env.MTN_COLLECTION_PRIMARY_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('MTN request to pay failed:', errorText)
      return {
        success: false,
        error: 'Payment request failed',
        statusCode: response.status,
      }
    }

    return {
      success: true,
      referenceId,
    }
  } catch (error) {
    console.error('MTN request to pay error:', error)
    return { success: false, error: 'An error occurred' }
  }
}

/**
 * Check payment status
 *
 * @param referenceId Reference ID from requestToPay response
 */
export async function checkPaymentStatusMTN(referenceId: string): Promise<{
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED'
  amount?: string
  currency?: string
  financialTransactionId?: string
  reason?: string
} | null> {
  try {
    const accessToken = await getAccessToken()
    if (!accessToken) {
      return null
    }

    const response = await fetch(
      `${process.env.MTN_API_URL}/collection/v1_0/requesttopay/${referenceId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Target-Environment': process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
          'Ocp-Apim-Subscription-Key': process.env.MTN_COLLECTION_PRIMARY_KEY!,
        },
      }
    )

    if (!response.ok) {
      console.error('Failed to check MTN payment status')
      return null
    }

    const data = await response.json()
    return {
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      financialTransactionId: data.financialTransactionId,
      reason: data.reason,
    }
  } catch (error) {
    console.error('MTN check status error:', error)
    return null
  }
}

/**
 * Validate phone number format for MTN Uganda
 * Should be in format: 256XXXXXXXXX (country code + number without leading 0)
 */
export function validateMTNPhoneNumber(phoneNumber: string): boolean {
  // Remove any spaces or special characters
  const cleaned = phoneNumber.replace(/[^\d]/g, '')

  // Should start with 256 and be 12 digits total
  if (!cleaned.startsWith('256') || cleaned.length !== 12) {
    return false
  }

  // MTN Uganda prefixes: 77, 78, 76
  const prefix = cleaned.substring(3, 5)
  return ['77', '78', '76'].includes(prefix)
}

/**
 * Format phone number to MTN API format
 * Converts: 0771234567 → 256771234567
 * Converts: +256771234567 → 256771234567
 */
export function formatMTNPhoneNumber(phoneNumber: string): string {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/[^\d]/g, '')

  // If starts with 0, replace with 256
  if (cleaned.startsWith('0')) {
    cleaned = '256' + cleaned.substring(1)
  }

  // If already has 256, use as is
  if (cleaned.startsWith('256')) {
    return cleaned
  }

  // Otherwise, add 256
  return '256' + cleaned
}
