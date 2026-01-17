'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function LeasesPage() {
  const [leases, setLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLease, setSelectedLease] = useState<any>(null)
  const [terminatingLeaseId, setTerminatingLeaseId] = useState<string | null>(null)
  const [showTerminateConfirm, setShowTerminateConfirm] = useState<string | null>(null)
  const [deletingLeaseId, setDeletingLeaseId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

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

  const handleTerminateLease = async (leaseId: string) => {
    setTerminatingLeaseId(leaseId)
    try {
      const response = await fetch(`/api/landlord/leases/${leaseId}/terminate`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh the leases list
        await fetchLeases()
        setShowTerminateConfirm(null)
        setSelectedLease(null)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to terminate lease')
      }
    } catch (error) {
      console.error('Failed to terminate lease:', error)
      alert('Failed to terminate lease')
    } finally {
      setTerminatingLeaseId(null)
    }
  }

  const handleDeleteLease = async (leaseId: string) => {
    setDeletingLeaseId(leaseId)
    try {
      const response = await fetch(`/api/landlord/leases/${leaseId}/delete`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh the leases list
        await fetchLeases()
        setShowDeleteConfirm(null)
        setSelectedLease(null)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete lease')
      }
    } catch (error) {
      console.error('Failed to delete lease:', error)
      alert('Failed to delete lease')
    } finally {
      setDeletingLeaseId(null)
    }
  }

  const getOrdinalSuffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th'
    switch (day % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
                      Due Date: {lease.rent_due_date ? `${lease.rent_due_date}${getOrdinalSuffix(lease.rent_due_date)} of each month` : 'Not set'}
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedLease(selectedLease?.id === lease.id ? null : lease)}
                  >
                    {selectedLease?.id === lease.id ? 'Hide Details' : 'View Details'}
                  </Button>
                </div>

                {/* Expanded Details Section */}
                {selectedLease?.id === lease.id && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tenant Information */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-700">Tenant Information</h4>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                          <p className="text-sm"><span className="text-gray-500">Name:</span> {lease.tenant?.first_name} {lease.tenant?.last_name}</p>
                          <p className="text-sm"><span className="text-gray-500">Email:</span> {lease.tenant_email}</p>
                          <p className="text-sm"><span className="text-gray-500">Phone:</span> {lease.tenant?.phone || 'Not provided'}</p>
                        </div>
                      </div>

                      {/* Property Information */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-700">Property Details</h4>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                          <p className="text-sm"><span className="text-gray-500">Property:</span> {lease.unit?.property?.name || 'N/A'}</p>
                          <p className="text-sm"><span className="text-gray-500">Unit:</span> {lease.unit?.unit_number || 'N/A'}</p>
                          <p className="text-sm"><span className="text-gray-500">Address:</span> {lease.unit?.property?.address || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Lease Terms */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-700">Lease Terms</h4>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                          <p className="text-sm"><span className="text-gray-500">Start Date:</span> {formatDate(lease.start_date)}</p>
                          <p className="text-sm"><span className="text-gray-500">End Date:</span> {formatDate(lease.end_date)}</p>
                          <p className="text-sm"><span className="text-gray-500">Monthly Rent:</span> {formatCurrency(lease.monthly_rent || 0)}</p>
                          <p className="text-sm"><span className="text-gray-500">Late Fee:</span> {formatCurrency(lease.late_fee_amount || 0)}</p>
                        </div>
                      </div>

                      {/* Financial Status */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-700">Financial Status</h4>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                          <p className="text-sm"><span className="text-gray-500">Opening Balance:</span> {formatCurrency(lease.opening_balance || 0)}</p>
                          <p className="text-sm"><span className="text-gray-500">Current Balance:</span> {formatCurrency(lease.current_balance || 0)}</p>
                          <p className="text-sm">
                            <span className="text-gray-500">Status:</span>{' '}
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              (lease.current_balance || 0) <= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {(lease.current_balance || 0) <= 0 ? 'Paid Up' : 'Balance Due'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Lease Status */}
                      <div className="space-y-2 md:col-span-2">
                        <h4 className="font-semibold text-sm text-gray-700">Lease Status</h4>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex flex-wrap gap-4">
                            <p className="text-sm">
                              <span className="text-gray-500">Signed:</span>{' '}
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                lease.signed_at ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {lease.signed_at ? `Yes (${formatDate(lease.signed_at)})` : 'Pending'}
                              </span>
                            </p>
                            <p className="text-sm"><span className="text-gray-500">Created:</span> {formatDate(lease.created_at)}</p>
                            {lease.access_code && lease.status === 'pending' && (
                              <p className="text-sm"><span className="text-gray-500">Access Code:</span> <code className="bg-gray-200 px-2 py-0.5 rounded">{lease.access_code}</code></p>
                            )}
                          </div>
                          {lease.signed_at && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <Link href={`/landlord/lease/${lease.id}/view`}>
                                <Button variant="outline" size="sm">
                                  View Signed Agreement
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Terminate Lease Section - Only show for active or pending leases */}
                      {(lease.status === 'active' || lease.status === 'pending') && (
                        <div className="space-y-2 md:col-span-2">
                          <h4 className="font-semibold text-sm text-gray-700">Lease Actions</h4>
                          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                            {showTerminateConfirm === lease.id ? (
                              <div className="space-y-3">
                                <p className="text-sm text-red-800 font-medium">
                                  Are you sure you want to terminate this lease?
                                </p>
                                <p className="text-xs text-red-700">
                                  This will:
                                </p>
                                <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                                  <li>Mark the lease as terminated</li>
                                  <li>Set the unit back to vacant</li>
                                  <li>Block the tenant from accessing the app</li>
                                  <li>Keep the lease record for historical purposes</li>
                                </ul>
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleTerminateLease(lease.id)}
                                    disabled={terminatingLeaseId === lease.id}
                                  >
                                    {terminatingLeaseId === lease.id ? 'Terminating...' : 'Yes, Terminate Lease'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowTerminateConfirm(null)}
                                    disabled={terminatingLeaseId === lease.id}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-red-800 font-medium">Terminate Lease</p>
                                  <p className="text-xs text-red-700">End this lease agreement and make the unit available</p>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setShowTerminateConfirm(lease.id)}
                                >
                                  Terminate
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Delete Lease Section - Only show for terminated leases */}
                      {lease.status === 'terminated' && (
                        <div className="space-y-2 md:col-span-2">
                          <h4 className="font-semibold text-sm text-gray-700">Lease Actions</h4>
                          <div className="bg-gray-100 p-3 rounded-lg border border-gray-300">
                            {showDeleteConfirm === lease.id ? (
                              <div className="space-y-3">
                                <p className="text-sm text-gray-800 font-medium">
                                  Are you sure you want to permanently delete this lease?
                                </p>
                                <p className="text-xs text-gray-700">
                                  This will permanently remove:
                                </p>
                                <ul className="text-xs text-gray-700 list-disc list-inside space-y-1">
                                  <li>The lease record</li>
                                  <li>All transaction history</li>
                                  <li>Signature records</li>
                                  <li>This action cannot be undone</li>
                                </ul>
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteLease(lease.id)}
                                    disabled={deletingLeaseId === lease.id}
                                  >
                                    {deletingLeaseId === lease.id ? 'Deleting...' : 'Yes, Delete Permanently'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDeleteConfirm(null)}
                                    disabled={deletingLeaseId === lease.id}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-800 font-medium">Delete Lease</p>
                                  <p className="text-xs text-gray-600">Permanently remove this terminated lease and all its records</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowDeleteConfirm(lease.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
