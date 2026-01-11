import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()
  
  // Get ALL leases
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
