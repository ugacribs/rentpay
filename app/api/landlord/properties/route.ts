import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

export async function GET() {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service client to bypass RLS
    const supabase = createServiceClient()

    const { data: properties, error } = await supabase
      .from('properties')
      .select(`
        *,
        units (id, unit_number, status)
      `)
      .eq('landlord_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching properties:', error)
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
    }

    console.log('Current user ID:', user.id)
    console.log('Properties found:', properties?.length || 0)

    return NextResponse.json(properties || [])
  } catch (error) {
    console.error('Properties API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, units } = body

    if (!name || !address) {
      return NextResponse.json(
        { error: 'Property name and address are required' },
        { status: 400 }
      )
    }

    // Use service client to bypass RLS
    const supabase = createServiceClient()

    // Create property with the current user as landlord
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        name,
        address,
        landlord_id: user.id,
      })
      .select()
      .single()

    if (propertyError) {
      console.error('Error creating property:', propertyError)
      return NextResponse.json(
        { error: `Failed to create property: ${propertyError.message}` },
        { status: 500 }
      )
    }

    // Create units if provided
    if (units && Array.isArray(units) && units.length > 0) {
      const unitsToInsert = units.map((unit: { unit_number: string }) => ({
        property_id: property.id,
        unit_number: unit.unit_number,
        status: 'vacant',
      }))

      const { error: unitsError } = await supabase
        .from('units')
        .insert(unitsToInsert)

      if (unitsError) {
        console.error('Error creating units:', unitsError)
        // Don't fail the whole request, property was created
      }
    }

    // Fetch the property with units
    const { data: fullProperty } = await supabase
      .from('properties')
      .select(`
        *,
        units (id, unit_number, status)
      `)
      .eq('id', property.id)
      .single()

    return NextResponse.json(fullProperty)
  } catch (error) {
    console.error('Create property error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
