'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/ui/form'

export default function NewLeasePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [units, setUnits] = useState<any[]>([])
  const [loadingUnits, setLoadingUnits] = useState(true)

  const [formData, setFormData] = useState({
    unitId: '',
    tenantEmail: '',
    monthlyRent: '',
    lateFeeAmount: '',
    openingBalance: '0',
  })

  useEffect(() => {
    fetchVacantUnits()
  }, [])

  const fetchVacantUnits = async () => {
    try {
      const response = await fetch('/api/landlord/units/vacant')
      if (!response.ok) throw new Error('Failed to fetch units')
      const data = await response.json()
      setUnits(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingUnits(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/landlord/leases/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          monthlyRent: parseFloat(formData.monthlyRent),
          lateFeeAmount: parseFloat(formData.lateFeeAmount),
          openingBalance: parseFloat(formData.openingBalance),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create lease')
      }

      const emailStatus = data.emailSent
        ? `An invite email has been sent to ${formData.tenantEmail}.`
        : `Email could not be sent. Please share the access code manually with the tenant.`

      alert(`Lease created successfully!\n\nAccess Code: ${data.accessCode}\n\n${emailStatus}`)
      router.push('/landlord/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  if (loadingUnits) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Create New Lease</h1>
        <p className="text-gray-600">Loading available units...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Create New Lease</h1>
        <p className="text-gray-600">Set up a lease agreement for a new tenant</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Lease Details</CardTitle>
          <CardDescription>
            Enter the tenant and lease information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {units.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>No vacant units available.</strong> All units are currently occupied.
                Please make a unit vacant before creating a new lease.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormField>
                <Label htmlFor="unitId">Select Unit</Label>
                <Select value={formData.unitId} onValueChange={(value) => handleInputChange('unitId', value)}>
                  <SelectTrigger id="unitId">
                    <SelectValue placeholder="Choose a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        Unit {unit.unit_number} - {unit.property?.name || 'N/A'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Tenant Information</h3>
                <div className="space-y-4">
                  <FormField>
                    <Label htmlFor="tenantEmail">Tenant Email</Label>
                    <Input
                      id="tenantEmail"
                      type="email"
                      value={formData.tenantEmail}
                      onChange={(e) => handleInputChange('tenantEmail', e.target.value)}
                      placeholder="tenant@example.com"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      The tenant will provide their name during signup
                    </p>
                  </FormField>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Rent Details</h3>
                <div className="space-y-4">
                  <FormField>
                    <Label htmlFor="monthlyRent">Monthly Rent (UGX)</Label>
                    <Input
                      id="monthlyRent"
                      type="number"
                      value={formData.monthlyRent}
                      onChange={(e) => handleInputChange('monthlyRent', e.target.value)}
                      placeholder="500000"
                      min="0"
                      step="1000"
                      required
                    />
                  </FormField>

                  <FormField>
                    <Label htmlFor="lateFeeAmount">Late Fee Amount (UGX)</Label>
                    <Input
                      id="lateFeeAmount"
                      type="number"
                      value={formData.lateFeeAmount}
                      onChange={(e) => handleInputChange('lateFeeAmount', e.target.value)}
                      placeholder="50000"
                      min="0"
                      step="1000"
                      required
                    />
                  </FormField>

                  <FormField>
                    <Label htmlFor="openingBalance">Opening Balance (UGX)</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      value={formData.openingBalance}
                      onChange={(e) => handleInputChange('openingBalance', e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1000"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Optional: Any existing balance the tenant owes
                    </p>
                  </FormField>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-semibold mb-2 text-blue-900">What happens next:</h3>
                <ol className="space-y-1 text-sm text-blue-800">
                  <li>1. An access code will be generated</li>
                  <li>2. Tenant receives email with access code and signup link</li>
                  <li>3. Tenant signs up and selects rent due date</li>
                  <li>4. Tenant signs lease digitally</li>
                  <li>5. Prorated rent is charged immediately</li>
                  <li>6. Automatic billing begins on selected due date</li>
                </ol>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Lease'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
