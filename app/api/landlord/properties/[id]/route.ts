import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Use service client to bypass RLS
    const supabase = createServiceClient()

    const { data: property, error } = await supabase
      .from('properties')
      .select(`
        *,
        units (id, unit_number, status, description)
      `)
      .eq('id', id)
      .eq('landlord_id', user.id)
      .single()

    if (error || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error('Property API error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
