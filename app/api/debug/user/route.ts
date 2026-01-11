import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/auth-helpers'

// Debug endpoint - remove in production
export async function GET() {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        message: 'Not logged in'
      })
    }

    const supabase = createServiceClient()

    // Get all properties (regardless of landlord_id)
    const { data: allProperties } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .limit(10)

    // Get user's properties
    const { data: userProperties, error: userPropertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .eq('landlord_id', user.id)

    // Also get properties with units
    const { data: propertiesWithUnits, error: unitsError } = await supabase
      .from('properties')
      .select(`
        id, name, landlord_id,
        units (id, unit_number, status)
      `)
      .eq('landlord_id', user.id)

    // Check if any property landlord_id matches (case-sensitive comparison)
    const matchCheck = allProperties?.map(p => ({
      propertyId: p.id,
      propertyName: p.name,
      landlordIdInDb: p.landlord_id,
      yourUserId: user.id,
      exactMatch: p.landlord_id === user.id,
      landlordIdType: typeof p.landlord_id,
      userIdType: typeof user.id
    }))

    return NextResponse.json({
      authenticated: true,
      currentUser: {
        id: user.id,
        email: user.email,
      },
      allPropertiesInDatabase: allProperties,
      propertiesMatchingYourUserId: userProperties,
      propertiesWithUnits: propertiesWithUnits,
      matchAnalysis: matchCheck,
      errors: {
        userPropertiesError: userPropertiesError?.message,
        unitsError: unitsError?.message
      },
      note: "Check matchAnalysis to see if landlord_id exactly matches your user id"
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
