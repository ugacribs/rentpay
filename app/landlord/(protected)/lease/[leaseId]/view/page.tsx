'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

export default function LandlordLeaseViewPage() {
  const router = useRouter()
  const params = useParams()
  const leaseId = params.leaseId as string

  const [leaseData, setLeaseData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!leaseId) return
    fetchLeaseData()
  }, [leaseId])

  const fetchLeaseData = async () => {
    try {
      const response = await fetch(`/api/lease-agreement/${leaseId}`)
      if (!response.ok) throw new Error('Failed to fetch lease data')
      const data = await response.json()
      setLeaseData({ ...data.lease, signature: data.signature })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = () => {
    if (!leaseData) return
    // Open in new tab for printing to PDF
    window.open(`/api/lease-agreement/${leaseData.id}/pdf`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-3xl">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Loading lease agreement...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !leaseData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-3xl">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">{error || 'Lease not found'}</p>
            <Button onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const rentDueDay = leaseData.rent_due_date || 1
  const propertyAddress = leaseData.unit?.property?.address || 'the Property'
  const unitNumber = leaseData.unit?.unit_number || 'N/A'
  const monthlyRent = leaseData.monthly_rent || 0
  const lateFee = leaseData.late_fee_amount || 0
  const openingBalance = leaseData.opening_balance || 0
  const tenantEmail = leaseData.tenant_email || ''
  const tenantFirstName = leaseData.tenant_first_name || ''
  const tenantLastName = leaseData.tenant_last_name || ''
  const tenantFullName = tenantFirstName && tenantLastName
    ? `${tenantFirstName} ${tenantLastName}`
    : tenantEmail

  const signedDate = leaseData.signed_at 
    ? new Date(leaseData.signed_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Not signed'

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">View Lease Agreement</h1>
          <p className="text-gray-600">
            {tenantFullName} - Unit {unitNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => router.back()}
          >
            Back
          </Button>
          {leaseData.signed_at && (
            <Button onClick={handleDownloadPDF}>
              Print / Download PDF
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-8 md:p-12">
          {/* Document Header */}
          <div className="text-center border-b-2 border-gray-800 pb-6 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-wide">
              TENANCY AGREEMENT
            </h2>
            <p className="text-sm text-gray-600 mt-2">Month-to-Month Tenancy</p>
          </div>

          {/* Document Body */}
          <div className="space-y-6 text-gray-800 leading-relaxed">
            {/* Preamble */}
            <p className="text-sm">
              This Tenancy Agreement (&quot;Agreement&quot;) is entered into on{' '}
              <span className="font-semibold underline">{signedDate}</span>, by and between{' '}
              <span className="font-semibold">UgaCribs Company Limited</span> (&quot;the Landlord&quot;)
              and <span className="font-semibold">{tenantFullName}</span> of email{' '}
              <span className="font-semibold">{tenantEmail}</span> (&quot;the Tenant&quot;).
            </p>

            {/* Article 1: Property */}
            <div>
              <h3 className="text-lg font-bold mb-2">1. PROPERTY</h3>
              <p className="text-sm pl-4">
                The Landlord agrees to rent to the Tenant and the Tenant agrees to rent from the Landlord
                the residential property located at:
              </p>
              <div className="mt-2 pl-4 py-3 bg-gray-50 border-l-4 border-gray-400">
                <p className="font-semibold">{propertyAddress}</p>
                <p className="text-sm">Unit: {unitNumber}</p>
              </div>
            </div>

            {/* Article 2: Term */}
            <div>
              <h3 className="text-lg font-bold mb-2">2. TERM</h3>
              <p className="text-sm pl-4">
                This Agreement shall be a month-to-month tenancy, commencing on the date of signing.
                Either party may terminate this Agreement by providing written notice of at least <strong>ONE</strong> month.
              </p>
            </div>

            {/* Article 3: Rent */}
            <div>
              <h3 className="text-lg font-bold mb-2">3. RENT</h3>
              <div className="pl-4 space-y-3 text-sm">
                <p>
                  <span className="font-semibold">3.1 Monthly Rent:</span> The Tenant agrees to pay a monthly rent of{' '}
                  <span className="font-bold text-lg">{formatCurrency(monthlyRent)}</span>.
                </p>
                <p>
                  <span className="font-semibold">3.2 Due Date:</span> Rent shall be due on the{' '}
                  <span className="font-bold">{rentDueDay}{getOrdinalSuffix(rentDueDay)}</span> day of each month.
                  Rent charges will be automatically added to the Tenant&apos;s account at 00:01 on the day
                  before the due date.
                </p>
                <p>
                  <span className="font-semibold">3.3 Prorated Rent:</span> Upon signing this Agreement, the Tenant
                  will be charged a prorated amount for the period from the signing date until the first
                  regular rent due date.
                </p>
                {openingBalance > 0 && (
                  <p>
                    <span className="font-semibold">3.4 Opening Balance:</span> The Tenant acknowledges an opening
                    balance of <span className="font-bold">{formatCurrency(openingBalance)}</span> which is due
                    immediately upon signing.
                  </p>
                )}
              </div>
            </div>

            {/* Article 4: Late Fees */}
            <div>
              <h3 className="text-lg font-bold mb-2">4. LATE FEES</h3>
              <div className="pl-4 space-y-3 text-sm">
                <p>
                  <span className="font-semibold">4.1 Grace Period:</span> A grace period of five (5) days after
                  the rent due date shall be provided before late fees are assessed.
                </p>
                <p>
                  <span className="font-semibold">4.2 Late Fee Amount:</span> The base late fee shall be{' '}
                  <span className="font-bold">{formatCurrency(lateFee)}</span> per month.
                </p>
                <p>
                  <span className="font-semibold">4.3 Payment of Late Fees:</span> Any late fees charged form part of
                  the outstanding rent and are due for <strong>IMMEDIATE</strong> payment, together with the outstanding rent.
                </p>
                <p>
                  <span className="font-semibold">4.4 Proportional Late Fees:</span> Late fees shall be calculated
                  proportionally based on the outstanding balance relative to the monthly rent. For example,
                  if the outstanding balance equals half the monthly rent, half the late fee applies; if the
                  balance equals double the monthly rent, double the late fee applies.
                </p>
              </div>
            </div>

            {/* Article 5: Payment */}
            <div>
              <h3 className="text-lg font-bold mb-2">5. PAYMENT METHOD</h3>
              <p className="text-sm pl-4">
                Rent payments shall be made <strong>STRICTLY</strong> through the RentPay platform using mobile money via <strong>MTN</strong> or <strong>AIRTEL</strong>.
                Any money paid by any other means will not be recognised as rent and the Tenant is solely responsible
                for the loss of such money. The landlord will not accept liability for any money paid by cash or any
                other unauthorised means.
              </p>
            </div>

            {/* Article 6: General Terms */}
            <div>
              <h3 className="text-lg font-bold mb-2">6. GENERAL TERMS</h3>
              <div className="pl-4 space-y-2 text-sm">
                <p>
                  <span className="font-semibold">6.1</span> The Tenant shall use the premises solely for
                  residential purposes.
                </p>
                <p>
                  <span className="font-semibold">6.2</span> The Tenant shall maintain the premises in good
                  condition and promptly report any maintenance issues to the Landlord.
                </p>
                <p>
                  <span className="font-semibold">6.3</span> The Tenant shall maintain a rubbish bin to collect
                  their rubbish and subsequently dispose it of with <strong>K.C.C.A.</strong>
                </p>
                <p>
                  <span className="font-semibold">6.4</span> The Tenant shall have a <strong>MAXIMUM</strong> of <strong>TWO</strong> adults in the
                  house as residents. The Tenant being one of them.
                </p>
                <p>
                  <span className="font-semibold">6.5</span> This Agreement shall be governed by the laws
                  of the Republic of Uganda.
                </p>
              </div>
            </div>

            {/* Signature Section */}
            <div className="mt-10 pt-6 border-t-2 border-gray-300">
              <h3 className="text-lg font-bold mb-4">SIGNATURES</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tenant Signature */}
                <div>
                  <h4 className="text-lg font-bold mb-3">TENANT</h4>
                  {leaseData.signature?.signature_data ? (
                    <div className="border-2 border-gray-400 rounded-md bg-white p-2 h-28 flex items-center justify-center">
                      <img
                        src={leaseData.signature.signature_data}
                        alt="Tenant Signature"
                        className="h-20 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-400 rounded-md bg-gray-50 h-28 flex items-center justify-center">
                      <p className="text-gray-400 text-sm">No signature</p>
                    </div>
                  )}
                  <p className="text-center mt-2 text-sm font-semibold text-gray-800">{leaseData.tenant_first_name} {leaseData.tenant_last_name}</p>
                  {leaseData.signed_at && (
                    <p className="text-center text-xs text-gray-600 mt-1">
                      Signed on: {new Date(leaseData.signed_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>

                {/* Landlord Signature */}
                <div>
                  <h4 className="text-lg font-bold mb-3">LANDLORD</h4>
                  {leaseData.landlord_signature_data ? (
                    <div className="border-2 border-gray-400 rounded-md bg-white p-2 h-28 flex items-center justify-center">
                      <img
                        src={leaseData.landlord_signature_data}
                        alt="Landlord Signature"
                        className="h-20 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-400 rounded-md bg-gray-50 h-28 flex items-center justify-center">
                      <p className="text-gray-400 text-sm">No signature</p>
                    </div>
                  )}
                  <p className="text-center mt-2 text-sm font-semibold text-gray-800">For and on behalf of UgaCribs Company Limited</p>
                  {leaseData.landlord_signed_at && (
                    <p className="text-center text-xs text-gray-600 mt-1">
                      Signed on: {new Date(leaseData.landlord_signed_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
