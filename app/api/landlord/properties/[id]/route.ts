import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Use service client to bypass RLS
    const supabase = createServiceClient()

    // Fetch property with units (removed description column that doesn't exist)
    const { data: property, error } = await supabase
      .from('properties')
      .select(`
        *,
        units (id, unit_number, status)
      `)
      .eq('id', id)
      .eq('landlord_id', user.id)
      .single()

    if (error || !property) {
      console.log('Property not found. Error:', error)
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error('Property API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, address } = body

    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Update property (only if owned by this landlord)
    const { data: property, error } = await supabase
      .from('properties')
      .update({ name, address })
      .eq('id', id)
      .eq('landlord_id', user.id)
      .select()
      .single()

    if (error || !property) {
      console.log('Property update error:', error)
      return NextResponse.json({ error: 'Failed to update property' }, { status: 404 })
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error('Property update API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
