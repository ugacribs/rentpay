'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

export default function SignLeasePage() {
  const router = useRouter()
  const sigPad = useRef<SignatureCanvas>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [leaseData, setLeaseData] = useState<any>(null)
  const [loadingLease, setLoadingLease] = useState(true)

  useEffect(() => {
    fetchLeaseData()
  }, [])

  const fetchLeaseData = async () => {
    try {
      const response = await fetch('/api/tenant/lease')
      if (!response.ok) throw new Error('Failed to fetch lease data')
      const data = await response.json()
      setLeaseData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingLease(false)
    }
  }

  const clearSignature = () => {
    sigPad.current?.clear()
  }

  const handleSubmit = async () => {
    if (sigPad.current?.isEmpty()) {
      setError('Please provide your signature')
      return
    }

    setLoading(true)
    setError('')

    try {
      const signatureData = sigPad.current?.toDataURL()

      const response = await fetch('/api/tenant/sign-lease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_data: signatureData }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign lease')
      }

      // Go directly to dashboard after signing
      router.push('/tenant/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingLease) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Loading lease details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Sign Your Lease Agreement</CardTitle>
          <CardDescription>
            Review the lease terms and provide your digital signature
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {leaseData && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
                <h3 className="font-semibold mb-3">Lease Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Property:</span>
                    <span className="font-medium">{leaseData.unit?.property?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit:</span>
                    <span className="font-medium">{leaseData.unit?.unit_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Rent:</span>
                    <span className="font-medium">{formatCurrency(leaseData.monthly_rent || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rent Due Date:</span>
                    <span className="font-medium">
                      {leaseData.rent_due_date}
                      {leaseData.rent_due_date === 1 ? 'st' :
                       leaseData.rent_due_date === 2 ? 'nd' :
                       leaseData.rent_due_date === 3 ? 'rd' : 'th'} of each month
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Late Fee:</span>
                    <span className="font-medium">{formatCurrency(leaseData.late_fee_amount || 0)}</span>
                  </div>
                  {leaseData.opening_balance > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Opening Balance:</span>
                      <span className="font-medium">{formatCurrency(leaseData.opening_balance)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-semibold mb-2 text-blue-900">Important Terms</h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Rent is due on the {leaseData.rent_due_date}{leaseData.rent_due_date === 1 ? 'st' : leaseData.rent_due_date === 2 ? 'nd' : leaseData.rent_due_date === 3 ? 'rd' : 'th'} of each month</li>
                  <li>• Automatic charges occur at 00:01 the day before due date</li>
                  <li>• Late fees apply if unpaid 5 days after due date</li>
                  <li>• Late fees are proportional to your outstanding balance (e.g., if you owe half the monthly rent, you pay half the late fee; if you owe double, you pay double)</li>
                  <li>• Month-to-month lease agreement</li>
                  <li>• Upon signing, prorated rent will be charged immediately</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Your Signature</h3>
                <p className="text-sm text-gray-600 mb-3">
                  By signing below, you agree to the lease terms and conditions
                </p>
                <div className="border-2 border-gray-300 rounded-md bg-white">
                  <SignatureCanvas
                    ref={sigPad}
                    canvasProps={{
                      className: 'w-full h-48 cursor-crosshair',
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                  >
                    Clear Signature
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> After signing, you will be charged prorated rent for the
                  days from today until your first rent due date. This charge will be processed
                  immediately through your selected payment method.
                </p>
              </div>

              <Button onClick={handleSubmit} disabled={loading} className="w-full">
                {loading ? 'Processing...' : 'Sign Lease & Continue'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
