import { NextRequest, NextResponse } from 'next/server'

/**
 * MTN API User Setup Endpoint
 *
 * This endpoint creates a new MTN API user with the correct callback URL.
 * Run this ONCE to get new credentials, then update your environment variables.
 *
 * SECURITY: This endpoint is protected by a secret key.
 * Call it with: POST /api/admin/mtn-setup
 * Header: x-admin-key: your-landlord-email
 */

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - use landlord email as admin key
    const adminKey = request.headers.get('x-admin-key')
    if (adminKey !== process.env.LANDLORD_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const MTN_API_URL = process.env.MTN_API_URL
    const MTN_PRIMARY_KEY = process.env.MTN_COLLECTION_PRIMARY_KEY
    const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL

    if (!MTN_API_URL || !MTN_PRIMARY_KEY) {
      return NextResponse.json(
        { error: 'Missing MTN_API_URL or MTN_COLLECTION_PRIMARY_KEY' },
        { status: 400 }
      )
    }

    console.log('Creating MTN API user with callback URL:', CALLBACK_URL)

    // Step 1: Create API User
    const userId = crypto.randomUUID()

    const createUserResponse = await fetch(`${MTN_API_URL}/v1_0/apiuser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
        'X-Reference-Id': userId,
      },
      body: JSON.stringify({
        providerCallbackHost: CALLBACK_URL,
      }),
    })

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text()
      console.error('Failed to create MTN API user:', createUserResponse.status, errorText)
      return NextResponse.json(
        {
          error: 'Failed to create API user',
          status: createUserResponse.status,
          details: errorText
        },
        { status: 400 }
      )
    }

    console.log('API user created successfully:', userId)

    // Step 2: Create API Key
    const createKeyResponse = await fetch(`${MTN_API_URL}/v1_0/apiuser/${userId}/apikey`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
      },
    })

    if (!createKeyResponse.ok) {
      const errorText = await createKeyResponse.text()
      console.error('Failed to create API key:', createKeyResponse.status, errorText)
      return NextResponse.json(
        {
          error: 'Failed to create API key',
          status: createKeyResponse.status,
          details: errorText
        },
        { status: 400 }
      )
    }

    const keyData = await createKeyResponse.json()

    console.log('API key created successfully')

    // Step 3: Verify the user was created with correct callback
    const verifyResponse = await fetch(`${MTN_API_URL}/v1_0/apiuser/${userId}`, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': MTN_PRIMARY_KEY,
      },
    })

    let callbackHost = 'unknown'
    if (verifyResponse.ok) {
      const userData = await verifyResponse.json()
      callbackHost = userData.providerCallbackHost || 'not set'
    }

    return NextResponse.json({
      success: true,
      message: 'MTN API user created successfully. Update your environment variables with these new credentials.',
      credentials: {
        MTN_COLLECTION_USER_ID: userId,
        MTN_COLLECTION_API_KEY: keyData.apiKey,
      },
      callbackHost,
      instructions: [
        '1. Copy the credentials above',
        '2. Update MTN_COLLECTION_USER_ID in Hostinger secrets',
        '3. Update MTN_COLLECTION_API_KEY in Hostinger secrets',
        '4. Update your local .env.local file',
        '5. Redeploy your app on Hostinger',
      ],
    })
  } catch (error) {
    console.error('MTN setup error:', error)
    return NextResponse.json(
      { error: 'An error occurred', details: String(error) },
      { status: 500 }
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    endpoint: 'mtn-setup',
    description: 'Creates a new MTN API user with correct callback URL',
    usage: 'POST with header x-admin-key: <your-landlord-email>',
  })
}
