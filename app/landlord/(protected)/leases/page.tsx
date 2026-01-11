'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function LeasesPage() {
  const [leases, setLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeases()
  }, [])

  const fetchLeases = async () => {
    try {
      const response = await fetch('/api/landlord/leases')
      if (response.ok) {
        const data = await response.json()
        setLeases(data)
      }
    } catch (error) {
      console.error('Failed to fetch leases:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Leases</h1>
        <p className="text-gray-600">Loading leases...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leases</h1>
          <p className="text-gray-600">Manage all lease agreements</p>
        </div>
        <Button asChild>
          <Link href="/landlord/leases/new">Create New Lease</Link>
        </Button>
      </div>

      {leases.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500 mb-4">No leases yet. Create your first lease to get started.</p>
            <Button asChild>
              <Link href="/landlord/leases/new">Create New Lease</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {leases.map((lease) => (
            <Card key={lease.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      Unit {lease.unit?.unit_number} - {lease.unit?.property?.name}
                    </CardTitle>
                    <CardDescription>
                      {lease.tenant?.first_name} {lease.tenant?.last_name} ({lease.tenant_email})
                    </CardDescription>
                  </div>
                  {getStatusBadge(lease.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Monthly Rent: UGX {lease.monthly_rent?.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Due Date: {lease.rent_due_day || 'Not set'}
                    </p>
                  </div>
                  <Button variant="outline">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
