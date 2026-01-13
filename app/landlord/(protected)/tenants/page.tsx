'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [ledgerTenant, setLedgerTenant] = useState<any>(null)
  const [ledgerData, setLedgerData] = useState<any>(null)
  const [loadingLedger, setLoadingLedger] = useState(false)
  const [chargeTenant, setChargeTenant] = useState<any>(null)
  const [chargeAmount, setChargeAmount] = useState('')
  const [chargeDescription, setChargeDescription] = useState('')
  const [isCredit, setIsCredit] = useState(false)
  const [addingCharge, setAddingCharge] = useState(false)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/landlord/tenants')
      if (response.ok) {
        const data = await response.json()
        setTenants(data)
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLedger = async (tenantId: string) => {
    setLoadingLedger(true)
    try {
      const response = await fetch(`/api/landlord/tenants/${tenantId}/transactions`)
      if (response.ok) {
        const data = await response.json()
        setLedgerData(data)
      }
    } catch (error) {
      console.error('Failed to fetch ledger:', error)
    } finally {
      setLoadingLedger(false)
    }
  }

  const handleViewLedger = (tenant: any) => {
    if (ledgerTenant?.id === tenant.id) {
      setLedgerTenant(null)
      setLedgerData(null)
    } else {
      setLedgerTenant(tenant)
      fetchLedger(tenant.id)
    }
  }

  const handleAddCharge = async (tenantId: string) => {
    if (!chargeAmount || !chargeDescription) {
      alert('Please enter amount and description')
      return
    }

    setAddingCharge(true)
    try {
      const response = await fetch(`/api/landlord/tenants/${tenantId}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(chargeAmount),
          description: chargeDescription,
          type: 'adjustment',
          isCredit: isCredit
        })
      })

      if (response.ok) {
        alert(isCredit ? 'Credit added successfully!' : 'Charge added successfully!')
        setChargeTenant(null)
        setChargeAmount('')
        setChargeDescription('')
        setIsCredit(false)
        // Refresh tenants to update balance
        fetchTenants()
        // If ledger is open for this tenant, refresh it
        if (ledgerTenant?.id === tenantId) {
          fetchLedger(tenantId)
        }
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add charge')
      }
    } catch (error) {
      console.error('Failed to add charge:', error)
      alert('Failed to add charge')
    } finally {
      setAddingCharge(false)
    }
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

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Calculate running balance for ledger (newest first for display)
  const calculateLedgerWithBalance = () => {
    if (!ledgerData) return []

    const openingBalance = ledgerData.lease?.opening_balance || 0
    let runningBalance = openingBalance

    // First calculate running balances (oldest to newest)
    const withBalances = ledgerData.transactions.map((tx: any) => {
      // Payments and credits are stored as negative amounts
      // All other types (rent, late_fee, adjustment, prorated_rent) are positive
      // Simply add the amount to get the running balance
      runningBalance += tx.amount
      return { ...tx, runningBalance }
    })

    // Reverse to show newest first
    return withBalances.reverse()
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Tenants</h1>
        <p className="text-gray-600">Loading tenants...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tenants</h1>
        <p className="text-gray-600">Manage your tenants</p>
      </div>

      {tenants.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No tenants yet. Create a lease to add tenants.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tenants.map((tenant) => {
            const balance = tenant.lease?.current_balance || 0
            
            return (
              <Card key={tenant.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{tenant.first_name} {tenant.last_name}</CardTitle>
                      <CardDescription>{tenant.email}</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Outstanding Balance</p>
                      <p className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(balance)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">
                        Unit: {tenant.lease?.unit?.unit_number || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Property: {tenant.lease?.unit?.property?.name || 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          if (chargeTenant?.id === tenant.id) {
                            setChargeTenant(null)
                            setIsCredit(false)
                          } else {
                            setChargeTenant(tenant)
                          }
                        }}
                      >
                        {chargeTenant?.id === tenant.id ? 'Cancel' : 'Add Transaction'}
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewLedger(tenant)}
                      >
                        {ledgerTenant?.id === tenant.id ? 'Hide Ledger' : 'View Ledger'}
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTenant(selectedTenant?.id === tenant.id ? null : tenant)}
                      >
                        {selectedTenant?.id === tenant.id ? 'Hide Details' : 'View Details'}
                      </Button>
                    </div>
                  </div>

                  {/* Add Charge/Credit Form */}
                  {chargeTenant?.id === tenant.id && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold text-sm text-gray-700 mb-3">Add Transaction</h4>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        {/* Charge/Credit Toggle */}
                        <div className="flex rounded-lg overflow-hidden border">
                          <button
                            type="button"
                            onClick={() => setIsCredit(false)}
                            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                              !isCredit
                                ? 'bg-red-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            Charge (Debit)
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCredit(true)}
                            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                              isCredit
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            Credit
                          </button>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`amount-${tenant.id}`}>Amount (UGX)</Label>
                          <Input
                            id={`amount-${tenant.id}`}
                            type="number"
                            placeholder="e.g., 500000"
                            value={chargeAmount}
                            onChange={(e) => setChargeAmount(e.target.value)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`desc-${tenant.id}`}>Description</Label>
                          <Input
                            id={`desc-${tenant.id}`}
                            type="text"
                            placeholder={isCredit ? "e.g., Discount for early payment" : "e.g., Repair costs"}
                            value={chargeDescription}
                            onChange={(e) => setChargeDescription(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={() => handleAddCharge(tenant.id)}
                          disabled={addingCharge}
                          className={`w-full ${isCredit ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                          {addingCharge ? 'Adding...' : isCredit ? 'Add Credit' : 'Add Charge'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Ledger Section */}
                  {ledgerTenant?.id === tenant.id && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold text-sm text-gray-700 mb-3">Account Ledger</h4>
                      {loadingLedger ? (
                        <p className="text-gray-500 text-sm">Loading ledger...</p>
                      ) : ledgerData ? (
                        <div className="bg-gray-50 rounded-lg overflow-hidden">
                          {/* Opening Balance */}
                          <div className="px-3 py-2 border-b bg-gray-100 flex justify-between text-sm">
                            <span className="font-medium">Opening Balance</span>
                            <span className="font-medium">{formatCurrency(ledgerData.lease?.opening_balance || 0)}</span>
                          </div>
                          
                          {/* Transactions */}
                          {calculateLedgerWithBalance().length === 0 ? (
                            <p className="text-gray-500 text-sm p-3">No transactions yet.</p>
                          ) : (
                            <div className="max-h-64 overflow-y-auto">
                              {calculateLedgerWithBalance().map((tx: any) => {
                                // Credits and payments have negative amounts (reduce balance)
                                const isDebit = tx.amount > 0
                                return (
                                  <div key={tx.id} className="px-3 py-2 border-b last:border-0 flex justify-between items-center text-sm">
                                    <div>
                                      <p className="font-medium">{tx.description}</p>
                                      <p className="text-xs text-gray-500">{formatDateTime(tx.created_at)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className={isDebit ? 'text-red-600' : 'text-green-600'}>
                                        {isDebit ? '+' : ''}{formatCurrency(tx.amount)}
                                      </p>
                                      <p className="text-xs text-gray-500">Bal: {formatCurrency(tx.runningBalance)}</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          
                          {/* Current Balance */}
                          <div className="px-3 py-2 border-t bg-gray-100 flex justify-between text-sm">
                            <span className="font-bold">Current Balance</span>
                            <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(balance)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Failed to load ledger.</p>
                      )}
                    </div>
                  )}

                  {/* Expanded Details Section */}
                  {selectedTenant?.id === tenant.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Personal Information */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700">Personal Information</h4>
                          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                            <p className="text-sm"><span className="text-gray-500">Phone:</span> {tenant.phone || 'Not provided'}</p>
                            <p className="text-sm"><span className="text-gray-500">Email:</span> {tenant.email}</p>
                            <p className="text-sm"><span className="text-gray-500">ID Type:</span> {tenant.id_type || 'Not provided'}</p>
                            <p className="text-sm"><span className="text-gray-500">ID Number:</span> {tenant.id_number || 'Not provided'}</p>
                          </div>
                        </div>

                        {/* Lease Information */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700">Lease Information</h4>
                          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                            <p className="text-sm">
                              <span className="text-gray-500">Status:</span>{' '}
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                tenant.lease?.status === 'active' ? 'bg-green-100 text-green-700' :
                                tenant.lease?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {tenant.lease?.status || 'N/A'}
                              </span>
                            </p>
                            <p className="text-sm"><span className="text-gray-500">Monthly Rent:</span> {tenant.lease?.monthly_rent ? formatCurrency(tenant.lease.monthly_rent) : 'N/A'}</p>
                            <p className="text-sm"><span className="text-gray-500">Start Date:</span> {formatDate(tenant.lease?.start_date)}</p>
                            <p className="text-sm"><span className="text-gray-500">End Date:</span> {formatDate(tenant.lease?.end_date)}</p>
                          </div>
                        </div>

                        {/* Property Information */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700">Property Details</h4>
                          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                            <p className="text-sm"><span className="text-gray-500">Property:</span> {tenant.lease?.unit?.property?.name || 'N/A'}</p>
                            <p className="text-sm"><span className="text-gray-500">Unit:</span> {tenant.lease?.unit?.unit_number || 'N/A'}</p>
                            <p className="text-sm"><span className="text-gray-500">Address:</span> {tenant.lease?.unit?.property?.address || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Account Status */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700">Account Status</h4>
                          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                            <p className="text-sm">
                              <span className="text-gray-500">Onboarding:</span>{' '}
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                tenant.onboarding_complete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {tenant.onboarding_complete ? 'Complete' : 'Incomplete'}
                              </span>
                            </p>
                            <p className="text-sm"><span className="text-gray-500">ID Uploaded:</span> {tenant.id_document_url ? 'Yes' : 'No'}</p>
                            <p className="text-sm"><span className="text-gray-500">Joined:</span> {formatDate(tenant.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
