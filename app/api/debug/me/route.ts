import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/auth-helpers'

// Debug endpoint - disabled in production
export async function GET() {
  // SECURITY: Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug endpoints disabled in production' }, { status: 403 })
  }

  const user = await getUser()

  return NextResponse.json({
    authenticated: !!user,
    userId: user?.id || null,
    email: user?.email || null,
    emailLower: user?.email?.toLowerCase() || null
  })
}
