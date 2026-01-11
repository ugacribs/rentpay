'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormField, FormMessage } from '@/components/ui/form'

export default function LandlordLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const sendOTP = async () => {
    if (!email) {
      setError('Email is required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send OTP')
      }
      setOtpSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async () => {
    if (!otp) {
      setError('OTP is required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otp }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Invalid OTP')
      }
      router.push('/landlord/dashboard')
      router.refresh()
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
          <div className="space-y-4">
            <FormField>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="landlord@example.com"
                disabled={otpSent}
                required
              />
            </FormField>
            {!otpSent ? (
              <Button onClick={sendOTP} disabled={loading} className="w-full">
                {loading ? 'Sending...' : 'Send Login Code'}
              </Button>
            ) : (
              <>
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
                  <FormMessage>Check your email for the login code</FormMessage>
                </FormField>
                <Button onClick={verifyOTP} disabled={loading} className="w-full">
                  {loading ? 'Verifying...' : 'Sign In'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setOtpSent(false)}
                  disabled={loading}
                  className="w-full"
                >
                  Use Different Email
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
