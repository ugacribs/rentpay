'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TenantOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'checking' | 'profile' | 'already_setup' | 'no_lease'>('checking')
  const [leaseInfo, setLeaseInfo] = useState<any>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
  })

  const checkOnboardingStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/tenant/onboarding-status')
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - redirect to signup
          router.push('/tenant/signup')
          return
        }
        throw new Error(data.error || 'Failed to check status')
      }

      if (data.status === 'complete') {
        // Already fully onboarded - go to dashboard
        router.push('/tenant/dashboard')
        return
      }

      if (data.status === 'needs_due_date') {
        // Profile done, needs to select due date
        router.push('/tenant/onboarding/rent-due-date')
        return
      }

      if (data.status === 'needs_signature') {
        // Due date set, needs to sign lease
        router.push('/tenant/onboarding/sign-lease')
        return
      }

      if (data.status === 'needs_profile') {
        // Need to create profile - show form
        setLeaseInfo(data.lease)
        setStatus('profile')
      } else if (data.status === 'no_lease') {
        setStatus('no_lease')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkOnboardingStatus()
  }, [checkOnboardingStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName) {
      setError('Please enter your first and last name')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/tenant/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete profile')
      }

      // Profile complete - go to rent due date selection
      router.push('/tenant/onboarding/rent-due-date')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Setting up your account...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'no_lease') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Lease Found</CardTitle>
            <CardDescription>
              We couldn&apos;t find a lease associated with your email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Please contact your landlord to ensure they have created a lease for your email address.
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to RentPay!</CardTitle>
          <CardDescription>
            Complete your profile to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {leaseInfo && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Great news!</strong> Your landlord has set up a lease for you at{' '}
                <strong>{leaseInfo.property_name}</strong>, Unit <strong>{leaseInfo.unit_number}</strong>.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter your first name"
                required
              />
            </div>

            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter your last name"
                required
              />
            </div>

            <div className="pt-2">
              <h3 className="font-semibold text-sm mb-2">Next steps:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Complete your profile (this step)</li>
                <li>Choose your rent due date</li>
                <li>Sign your lease digitally</li>
                <li>Start managing your rent!</li>
              </ol>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Saving...' : 'Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
