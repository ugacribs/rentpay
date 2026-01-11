'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField, FormMessage } from '@/components/ui/form'

interface Unit {
  id: string
  unit_number: string
}

interface CreateLeaseFormProps {
  units: Unit[]
  propertyId: string
}

export function CreateLeaseForm({ units, propertyId }: CreateLeaseFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    unitId: '',
    tenantEmail: '',
    monthlyRent: '',
    lateFeeAmount: '',
    openingBalance: '0',
  })

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

      router.push('/landlord/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <FormField>
        <Label htmlFor="unitId">Unit</Label>
        <Select
          value={formData.unitId}
          onValueChange={(value) => setFormData({ ...formData, unitId: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a unit" />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                Unit {unit.unit_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField>
        <Label htmlFor="tenantEmail">Tenant Email</Label>
        <Input
          id="tenantEmail"
          type="email"
          value={formData.tenantEmail}
          onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
          placeholder="tenant@example.com"
          required
        />
        <FormMessage>
          An email with signup instructions and access code will be sent to this address.
        </FormMessage>
      </FormField>

      <FormField>
        <Label htmlFor="monthlyRent">Monthly Rent (UGX)</Label>
        <Input
          id="monthlyRent"
          type="number"
          min="0"
          step="1"
          value={formData.monthlyRent}
          onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
          placeholder="500000"
          required
        />
      </FormField>

      <FormField>
        <Label htmlFor="lateFeeAmount">Late Fee Amount (UGX)</Label>
        <Input
          id="lateFeeAmount"
          type="number"
          min="0"
          step="1"
          value={formData.lateFeeAmount}
          onChange={(e) => setFormData({ ...formData, lateFeeAmount: e.target.value })}
          placeholder="50000"
          required
        />
        <FormMessage>
          This fee will be charged if rent is unpaid 5 days after the due date.
        </FormMessage>
      </FormField>

      <FormField>
        <Label htmlFor="openingBalance">Opening Balance (UGX)</Label>
        <Input
          id="openingBalance"
          type="number"
          step="1"
          value={formData.openingBalance}
          onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
          placeholder="0"
        />
        <FormMessage>
          For existing tenants being onboarded. Leave at 0 for new tenants.
        </FormMessage>
      </FormField>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Creating...' : 'Create Lease'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
