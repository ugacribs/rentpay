'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'

export default function TenantProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [lease, setLease] = useState<any>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      const [profileRes, leaseRes] = await Promise.all([
        fetch('/api/tenant/profile'),
        fetch('/api/tenant/lease'),
      ])

      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(profileData)
      }

      if (leaseRes.ok) {
        const leaseData = await leaseRes.json()
        setLease(leaseData)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const getDayOrdinal = (day: number) => {
    if (day === 1 || day === 21 || day === 31) return 'st'
    if (day === 2 || day === 22) return 'nd'
    if (day === 3 || day === 23) return 'rd'
    return 'th'
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setEmailSuccess('')

    if (!newEmail) {
      setEmailError('Please enter an email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    if (newEmail === profile?.email) {
      setEmailError('This is already your current email')
      return
    }

    setSavingEmail(true)

    try {
      const response = await fetch('/api/tenant/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update email')
      }

      setEmailSuccess(data.message)
      // Update local state to show new email
      setProfile({ ...profile, email: newEmail })

      // Close modal after 3 seconds
      setTimeout(() => {
        setShowEmailModal(false)
        setEmailSuccess('')
        setNewEmail('')
      }, 3000)
    } catch (err: any) {
      setEmailError(err.message)
    } finally {
      setSavingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="text-white hover:bg-white/20 p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <h1 className="text-xl font-bold">My Profile</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-white hover:bg-white/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Personal Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 text-sm">Full Name</span>
              <span className="font-medium">
                {profile?.first_name} {profile?.last_name}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 text-sm">Email</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{profile?.email}</span>
                <button
                  onClick={() => {
                    setNewEmail(profile?.email || '')
                    setEmailError('')
                    setEmailSuccess('')
                    setShowEmailModal(true)
                  }}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Change email"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                profile?.status === 'active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {profile?.status || 'Active'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 text-sm">Property</span>
              <span className="font-medium">{lease?.unit?.property?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 text-sm">Address</span>
              <span className="font-medium text-sm text-right max-w-[200px]">
                {lease?.unit?.property?.address || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">Unit Number</span>
              <span className="font-medium">{lease?.unit?.unit_number || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Lease Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Lease Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 text-sm">Monthly Rent</span>
              <span className="font-bold text-lg text-blue-600">
                {formatCurrency(lease?.monthly_rent || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 text-sm">Rent Due Date</span>
              <span className="font-medium">
                {lease?.rent_due_date || '-'}
                <span className="text-gray-500">
                  {lease?.rent_due_date ? getDayOrdinal(lease.rent_due_date) : ''}
                </span>
                <span className="text-gray-500 text-sm"> of every month</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 text-sm">Late Fee</span>
              <span className="font-medium">{formatCurrency(lease?.late_fee_amount || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-500 text-sm">Lease Start</span>
              <span className="font-medium">
                {lease?.start_date 
                  ? new Date(lease.start_date).toLocaleDateString('en-UG', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500 text-sm">Lease Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                lease?.status === 'active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {lease?.status || 'Pending'}
              </span>
            </div>
            <div className="pt-3 mt-3 border-t">
              <Button
                onClick={() => router.push('/tenant/lease')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                View Full Agreement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bottom padding */}
        <div className="h-4"></div>
      </div>

      {/* Email Change Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !savingEmail && setShowEmailModal(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl">
            {/* Modal Header */}
            <div className="border-b p-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Change Email Address</h2>
                <p className="text-sm text-gray-500">Update your account email</p>
              </div>
              <button
                onClick={() => !savingEmail && setShowEmailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
                disabled={savingEmail}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              {emailError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{emailError}</p>
                </div>
              )}

              {emailSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">{emailSuccess}</p>
                </div>
              )}

              <form onSubmit={handleEmailChange} className="space-y-4">
                <div>
                  <Label htmlFor="currentEmail" className="text-sm text-gray-500">Current Email</Label>
                  <Input
                    id="currentEmail"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>

                <div>
                  <Label htmlFor="newEmail" className="text-sm">New Email Address</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    className="mt-1"
                    disabled={savingEmail}
                  />
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> After changing your email, you will receive a confirmation link at your new email address. You must click this link to complete the change.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEmailModal(false)}
                    disabled={savingEmail}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingEmail}
                    className="flex-1"
                  >
                    {savingEmail ? 'Updating...' : 'Update Email'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
