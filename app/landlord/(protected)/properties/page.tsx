'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ledgerProperty, setLedgerProperty] = useState<any>(null)
  const [ledgerData, setLedgerData] = useState<any>(null)
  const [loadingLedger, setLoadingLedger] = useState(false)

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/landlord/properties')
      if (response.ok) {
        const data = await response.json()
        setProperties(data)
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLedger = async (propertyId: string) => {
    setLoadingLedger(true)
    try {
      const response = await fetch(`/api/landlord/properties/${propertyId}/transactions`)
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

  const handleViewLedger = (property: any) => {
    if (ledgerProperty?.id === property.id) {
      setLedgerProperty(null)
      setLedgerData(null)
    } else {
      setLedgerProperty(property)
      fetchLedger(property.id)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount)
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

  // Calculate running balance for property ledger (newest first for display)
  const calculateLedgerWithBalance = () => {
    if (!ledgerData) return []

    const totalOpeningBalance = ledgerData.totalOpeningBalance || 0
    let runningBalance = totalOpeningBalance

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

  // Calculate current total balance for property
  const calculatePropertyBalance = () => {
    if (!ledgerData) return 0
    const transactions = calculateLedgerWithBalance()
    if (transactions.length > 0) {
      return transactions[0].runningBalance
    }
    return ledgerData.totalOpeningBalance || 0
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Properties</h1>
        <p className="text-gray-600">Loading properties...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="text-gray-600">Manage your properties and units</p>
        </div>
        <Button asChild>
          <Link href="/landlord/properties/new">Add Property</Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500 mb-4">No properties yet. Add your first property to get started.</p>
            <Button asChild>
              <Link href="/landlord/properties/new">Add Property</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {properties.map((property) => (
            <Card key={property.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{property.name}</CardTitle>
                    <CardDescription>{property.address}</CardDescription>
                  </div>
                  <p className="text-sm text-gray-600">
                    {property.units?.length || 0} units
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/landlord/properties/${property.id}`}>View Details</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewLedger(property)}
                  >
                    {ledgerProperty?.id === property.id ? 'Hide Ledger' : 'View Ledger'}
                  </Button>
                </div>

                {/* Property Ledger Section */}
                {ledgerProperty?.id === property.id && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-sm text-gray-700 mb-3">Property Ledger (All Tenants)</h4>
                    {loadingLedger ? (
                      <p className="text-gray-500 text-sm">Loading ledger...</p>
                    ) : ledgerData ? (
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        {/* Current Balance */}
                        <div className="px-3 py-2 border-b bg-gray-100 flex justify-between text-sm">
                          <span className="font-bold">Current Total Balance</span>
                          <span className={`font-bold ${calculatePropertyBalance() > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(calculatePropertyBalance())}
                          </span>
                        </div>

                        {/* Transactions Table */}
                        {calculateLedgerWithBalance().length === 0 ? (
                          <p className="text-gray-500 text-sm p-3">No transactions yet.</p>
                        ) : (
                          <div className="max-h-96 overflow-x-auto overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100 border-b sticky top-0">
                                <tr>
                                  <th className="text-left p-2 font-medium text-gray-600">Date</th>
                                  <th className="text-left p-2 font-medium text-gray-600">Tenant</th>
                                  <th className="text-left p-2 font-medium text-gray-600">Description</th>
                                  <th className="text-right p-2 font-medium text-gray-600">Debit</th>
                                  <th className="text-right p-2 font-medium text-gray-600">Credit</th>
                                  <th className="text-right p-2 font-medium text-gray-600">Balance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y bg-white">
                                {calculateLedgerWithBalance().map((tx: any) => {
                                  // Credits and payments have negative amounts (reduce balance)
                                  const isCredit = tx.amount < 0
                                  const amount = Math.abs(tx.amount)
                                  return (
                                    <tr key={tx.id} className="hover:bg-gray-50">
                                      <td className="p-2 text-gray-600 whitespace-nowrap">
                                        {formatDateTime(tx.created_at)}
                                      </td>
                                      <td className="p-2 text-gray-500 whitespace-nowrap">
                                        {tx.tenant_name} • Unit {tx.unit_number}
                                      </td>
                                      <td className="p-2">{tx.description}</td>
                                      <td className="p-2 text-right text-red-600 font-medium">
                                        {!isCredit ? formatCurrency(amount) : '-'}
                                      </td>
                                      <td className="p-2 text-right text-green-600 font-medium">
                                        {isCredit ? formatCurrency(amount) : '-'}
                                      </td>
                                      <td className={`p-2 text-right font-semibold ${
                                        tx.runningBalance > 0 ? 'text-red-600' : 'text-green-600'
                                      }`}>
                                        {formatCurrency(tx.runningBalance)}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Opening Balance */}
                        <div className="px-3 py-2 border-t bg-gray-100 flex justify-between text-sm">
                          <span className="font-medium">Total Opening Balance</span>
                          <span className="font-medium">{formatCurrency(ledgerData.totalOpeningBalance || 0)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Failed to load ledger.</p>
                    )}
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
