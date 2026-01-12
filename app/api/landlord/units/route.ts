import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { propertyId, unitNumber } = body

    if (!propertyId || !unitNumber) {
      return NextResponse.json(
        { error: 'Property ID and unit number are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Verify the property belongs to this landlord
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('landlord_id', user.id)
      .single()

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check if unit number already exists for this property
    const { data: existingUnit } = await supabase
      .from('units')
      .select('id')
      .eq('property_id', propertyId)
      .eq('unit_number', unitNumber)
      .single()

    if (existingUnit) {
      return NextResponse.json(
        { error: 'A unit with this number already exists in this property' },
        { status: 400 }
      )
    }

    // Create the unit
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .insert({
        property_id: propertyId,
        unit_number: unitNumber,
        status: 'vacant',
      })
      .select()
      .single()

    if (unitError) {
      console.error('Unit creation error:', unitError)
      return NextResponse.json(
        { error: 'Failed to create unit' },
        { status: 500 }
      )
    }

    return NextResponse.json(unit, { status: 201 })
  } catch (error) {
    console.error('Unit API error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
