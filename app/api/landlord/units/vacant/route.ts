import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get all landlord's properties
    const { data: properties, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('landlord_id', user.id)

    if (propertyError) {
      console.error('Properties error:', propertyError)
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
    }

    if (!properties || properties.length === 0) {
      return NextResponse.json([])
    }

    const propertyIds = properties.map(p => p.id)

    // Get vacant units from all properties with property info
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select(`
        *,
        property:properties(*)
      `)
      .in('property_id', propertyIds)
      .eq('status', 'vacant')
      .order('unit_number')

    if (unitsError) {
      console.error('Units error:', unitsError)
      return NextResponse.json(
        { error: 'Failed to fetch units' },
        { status: 500 }
      )
    }

    return NextResponse.json(units || [])
  } catch (error) {
    console.error('Get vacant units error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
