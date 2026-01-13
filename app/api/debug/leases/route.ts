import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUser, isAuthorizedLandlord } from '@/lib/auth/auth-helpers'

export async function GET() {
  // SECURITY: Only allow in development mode AND require landlord auth
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug endpoints disabled in production' }, { status: 403 })
  }

  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAuthorizedLandlord(user.email)) {
    return NextResponse.json({ error: 'Forbidden - Landlord access only' }, { status: 403 })
  }

  const supabase = createServiceClient()

  // Get ALL leases (debug only)
  const { data: leases, error } = await supabase
    .from('leases')
    .select('id, tenant_email, status, tenant_id, created_at')
    .limit(50)

  return NextResponse.json({
    leases: leases || [],
    error: error?.message || null,
    count: leases?.length || 0
  })
}
