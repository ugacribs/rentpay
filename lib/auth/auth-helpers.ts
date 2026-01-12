import { createClient } from '@/lib/supabase/server'

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Check if the user is the authorized landlord
export function isAuthorizedLandlord(email: string | null | undefined): boolean {
  if (!email) return false
  const landlordEmail = process.env.LANDLORD_EMAIL?.toLowerCase()
  if (!landlordEmail) {
    console.warn('LANDLORD_EMAIL environment variable not set')
    return false
  }
  return email.toLowerCase() === landlordEmail
}

// Get landlord and verify authorization
export async function getAuthorizedLandlord() {
  const user = await getUser()
  if (!user) return null
  if (!isAuthorizedLandlord(user.email)) return null
  return user
}

export async function getUserRole() {
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()

  // Check if user is a tenant (by email)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('email', user.email)
    .single()

  if (tenant) return 'tenant'

  // Check if user is a landlord (has properties)
  const { data: property } = await supabase
    .from('properties')
    .select('id')
    .eq('landlord_id', user.id)
    .single()

  if (property) return 'landlord'

  return null
}

export async function getTenantData(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', userId)
    .single()

  return data
}

export async function getActiveLease(tenantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('leases')
    .select(`
      *,
      unit:units(
        *,
        property:properties(*)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single()

  return data
}
