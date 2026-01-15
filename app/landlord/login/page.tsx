'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormField, FormMessage } from '@/components/ui/form'
import { createClient } from '@/lib/supabase/client'

function LoginContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    // Surface auth failure errors from callback
    const urlError = searchParams.get('error')
    if (urlError === 'auth_failed') {
      setError('Authentication failed. Please try again.')
    } else if (urlError === 'unauthorized') {
      setError('Access denied. You are not authorized to access the landlord portal.')
    }
  }, [searchParams])

  const sendMagicLink = async () => {
    if (!email) {
      setError('Email is required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      // Use current origin for local dev, env var for production
      const siteUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? window.location.origin 
        : (process.env.NEXT_PUBLIC_APP_URL || 'https://darkviolet-seahorse-693324.hostingersite.com')
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${siteUrl}/landlord/auth/callback`,
        },
      })
      if (authError) {
        console.error('Magic link error:', authError)
        // Provide more user-friendly error messages
        if (authError.message.includes('rate limit')) {
          throw new Error('Too many login attempts. Please wait a few minutes and try again.')
        } else if (authError.message.includes('Email sending')) {
          throw new Error('Unable to send email. Please check your email address and try again.')
        }
        throw new Error(authError.message)
      }
      setEmailSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Landlord Portal</CardTitle>
          <CardDescription>
            Sign in to manage your properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          {emailSent ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>Check your email!</strong> We&apos;ve sent a magic link to <strong>{email}</strong>. 
                  Click the link in the email to sign in.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                }}
                className="w-full"
              >
                Use Different Email
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <FormField>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="landlord@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && sendMagicLink()}
                  required
                />
                <FormMessage>We&apos;ll send you a magic link to sign in</FormMessage>
              </FormField>
              <Button onClick={sendMagicLink} disabled={loading} className="w-full">
                {loading ? 'Sending...' : 'Send Magic Link'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function LandlordLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
