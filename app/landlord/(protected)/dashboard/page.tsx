'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function LandlordDashboard() {
  const [stats, setStats] = useState({
    totalUnits: 0,
    activeLeases: 0,
    vacantUnits: 0,
    pendingLeases: 0,
  })
  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState({
    totalReceivedThisMonth: 0,
    totalReceivedAllTime: 0,
    totalPrepaid: 0,
    totalPending: 0,
    aging: { current: 0, days31to60: 0, days61to90: 0, over90: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch properties to get total units
        const propertiesRes = await fetch('/api/landlord/properties')
        const properties = await propertiesRes.json()
        
        let totalUnits = 0
        let vacantUnits = 0
        if (Array.isArray(properties)) {
          properties.forEach((property: any) => {
            if (property.units && Array.isArray(property.units)) {
              totalUnits += property.units.length
              vacantUnits += property.units.filter((u: any) => u.status === 'vacant').length
            }
          })
        }

        // Fetch leases to get active and pending counts
        const leasesRes = await fetch('/api/landlord/leases')
        const leases = await leasesRes.json()
        
        let activeLeases = 0
        let pendingLeases = 0
        if (Array.isArray(leases)) {
          activeLeases = leases.filter((l: any) => l.status === 'active').length
          pendingLeases = leases.filter((l: any) => l.status === 'pending').length
        }

        setStats({
          totalUnits,
          activeLeases,
          vacantUnits,
          pendingLeases,
        })

        // Fetch finances
        const financesRes = await fetch('/api/landlord/finances')
        if (financesRes.ok) {
          const financesData = await financesRes.json()
          setTransactions(financesData.transactions || [])
          setSummary(financesData.summary || {
            totalReceivedThisMonth: 0,
            totalReceivedAllTime: 0,
            totalPrepaid: 0,
            totalPending: 0,
            aging: { current: 0, days31to60: 0, days61to90: 0, over90: 0 }
          })
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Landlord Portal</p>
        </div>
        <Link href="/landlord/leases/new">
          <Button>Create New Lease</Button>
        </Link>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Outstanding Balance</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {loading ? '...' : `UGX ${summary.totalPending.toLocaleString()}`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Aging Analysis</CardDescription>
            {loading ? (
              <CardTitle className="text-2xl text-gray-400">...</CardTitle>
            ) : (
              <div className="space-y-1 mt-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">0-30 days:</span>
                  <span className="font-medium text-yellow-600">UGX {summary.aging.current.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">31-60 days:</span>
                  <span className="font-medium text-orange-600">UGX {summary.aging.days31to60.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">61-90 days:</span>
                  <span className="font-medium text-red-500">UGX {summary.aging.days61to90.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">91+ days:</span>
                  <span className="font-medium text-red-700">UGX {summary.aging.over90.toLocaleString()}</span>
                </div>
              </div>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Received This Month</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {loading ? '...' : `UGX ${summary.totalReceivedThisMonth.toLocaleString()}`}
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              All time: {loading ? '...' : `UGX ${summary.totalReceivedAllTime.toLocaleString()}`}
            </p>
            {summary.totalPrepaid > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                Prepaid: {loading ? '...' : `UGX ${summary.totalPrepaid.toLocaleString()}`}
              </p>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Property Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Units</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? '...' : stats.totalUnits}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active Leases</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? '...' : stats.activeLeases}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Vacant Units</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? '...' : stats.vacantUnits}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending Leases</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? '...' : stats.pendingLeases}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest payment activity across all tenants</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-4">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No transactions yet.</p>
          ) : (
            <div className="space-y-4">
              {transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {transaction.tenant?.first_name} {transaction.tenant?.last_name} - {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className={`font-semibold ${transaction.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'payment' ? '+' : '-'} UGX {Math.abs(transaction.amount).toLocaleString()}
                  </p>
                </div>
              ))}
              {transactions.length > 10 && (
                <Link href="/landlord/finances" className="block text-center text-sm text-blue-600 hover:underline pt-2">
                  View all transactions →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
