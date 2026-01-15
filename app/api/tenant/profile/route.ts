import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant profile using service client (bypasses RLS)
    const { data: tenant, error: tenantError } = await serviceClient
      .from('tenants')
      .select('id, first_name, last_name, email, status')
      .eq('id', user.id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Get tenant profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceClient = createServiceClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, first_name, last_name } = body

    // If email is being changed
    if (email && email !== user.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }

      // Check if email is already in use by another user
      const { data: existingUser } = await serviceClient
        .from('tenants')
        .select('id')
        .eq('email', email)
        .neq('id', user.id)
        .single()

      if (existingUser) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 400 })
      }

      // Update email in Supabase Auth
      // This will send a confirmation email to the new address
      const { error: updateAuthError } = await supabase.auth.updateUser({
        email: email,
      })

      if (updateAuthError) {
        console.error('Auth email update error:', updateAuthError)
        return NextResponse.json(
          { error: 'Failed to update email. Please try again.' },
          { status: 500 }
        )
      }

      // Update email in tenants table
      const { error: tenantUpdateError } = await serviceClient
        .from('tenants')
        .update({ email })
        .eq('id', user.id)

      if (tenantUpdateError) {
        console.error('Tenant email update error:', tenantUpdateError)
      }

      // Update email in leases table (tenant_email field)
      const { error: leaseUpdateError } = await serviceClient
        .from('leases')
        .update({ tenant_email: email })
        .eq('tenant_id', user.id)

      if (leaseUpdateError) {
        console.error('Lease email update error:', leaseUpdateError)
      }

      return NextResponse.json({
        message: 'Email update initiated. Please check your new email address for a confirmation link.',
        requiresConfirmation: true
      })
    }

    // Update name fields if provided
    const updates: Record<string, string> = {}
    if (first_name) updates.first_name = first_name
    if (last_name) updates.last_name = last_name

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await serviceClient
        .from('tenants')
        .update(updates)
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
      }
    }

    return NextResponse.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update tenant profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
