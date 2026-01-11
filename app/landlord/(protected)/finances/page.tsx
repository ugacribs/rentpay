'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function FinancesPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalReceived: 0, totalPending: 0, totalOverdue: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFinances()
  }, [])

  const fetchFinances = async () => {
    try {
      const response = await fetch('/api/landlord/finances')
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
        setSummary(data.summary || { totalReceived: 0, totalPending: 0, totalOverdue: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch finances:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Finances</h1>
        <p className="text-gray-600">Loading financial data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Finances</h1>
        <p className="text-gray-600">Financial overview and transaction history</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Received</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              UGX {summary.totalReceived.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending Payments</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              UGX {summary.totalPending.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Overdue Payments</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              UGX {summary.totalOverdue.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest payment activity across all tenants</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No transactions yet.</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center border-b pb-4">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
