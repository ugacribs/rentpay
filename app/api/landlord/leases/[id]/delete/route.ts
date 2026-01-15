import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedLandlord()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leaseId } = await params
    const supabase = createServiceClient()

    // First verify this lease belongs to the landlord
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        unit:units (
          id,
          property:properties (
            id,
            landlord_id
          )
        )
      `)
      .eq('id', leaseId)
      .single()

    if (leaseError || !lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
    }

    // Verify landlord owns this property
    if (lease.unit?.property?.landlord_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow deletion of terminated leases
    if (lease.status !== 'terminated') {
      return NextResponse.json({ 
        error: 'Only terminated leases can be deleted. Please terminate the lease first.' 
      }, { status: 400 })
    }

    // Delete the lease (cascade will handle related records like transactions, signatures, etc.)
    const { error: deleteError } = await supabase
      .from('leases')
      .delete()
      .eq('id', leaseId)

    if (deleteError) {
      console.error('Failed to delete lease:', deleteError)
      return NextResponse.json({ error: 'Failed to delete lease' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Lease deleted successfully' 
    })
  } catch (error) {
    console.error('Delete lease error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
