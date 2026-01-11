import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/auth-helpers'

export async function GET() {
  const user = await getUser()
  
  return NextResponse.json({
    authenticated: !!user,
    userId: user?.id || null,
    email: user?.email || null,
    emailLower: user?.email?.toLowerCase() || null
  })
}
