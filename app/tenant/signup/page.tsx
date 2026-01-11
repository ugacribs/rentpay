'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormField, FormMessage } from '@/components/ui/form'

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Check if user is already authenticated from invite link; redirect to onboarding if so
    checkAuthStatus()

    // Surface auth failure errors
    const urlError = searchParams.get('error')
    if (urlError === 'auth_failed') {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/tenant/onboarding-status')
      if (response.ok) {
        router.push('/tenant/onboarding')
        return
      }
    } catch {
      // Not authenticated; fall through to show signup form
    }
    setLoading(false)
  }

  const sendOTP = async () => {
    if (!email) {
      setError('Email is required')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send verification code')
      }
      setOtpSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const verifyOTP = async () => {
    if (!otp) {
      setError('Verification code is required')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otp }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Invalid verification code')
      }
      // Authenticated; continue onboarding
      router.push('/tenant/onboarding')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking your account...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to RentPay</CardTitle>
          <CardDescription>
            {otpSent
              ? 'Enter the verification code sent to your email'
              : 'Enter your email to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Received an invite email?</strong> Click the link in that email to sign up automatically.
              Or enter your email below if you don&apos;t have the email.
            </p>
          </div>

          {!otpSent ? (
            <div className="space-y-4">
              <FormField>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
                <FormMessage>Use the same email your landlord used to create your lease</FormMessage>
              </FormField>
              <Button onClick={sendOTP} disabled={submitting} className="w-full">
                {submitting ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <FormField>
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                />
                <FormMessage>Check your email for the verification code</FormMessage>
              </FormField>
              <Button onClick={verifyOTP} disabled={submitting} className="w-full">
                {submitting ? 'Verifying...' : 'Verify & Continue'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setOtpSent(false)
                  setOtp('')
                  setError('')
                }}
                disabled={submitting}
                className="w-full"
              >
                Use Different Email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  )
}
