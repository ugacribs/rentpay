'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

export default function TenantDashboard() {
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState(0)
  const [lease, setLease] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])

  // Payment form
  const [amount, setAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [gateway, setGateway] = useState<'mtn' | 'airtel'>('mtn')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [leaseRes, transactionsRes] = await Promise.all([
        fetch('/api/tenant/lease'),
        fetch('/api/tenant/transactions'),
      ])

      if (!leaseRes.ok) throw new Error('Failed to fetch lease data')

      const leaseData = await leaseRes.json()
      setLease(leaseData)

      // Calculate balance
      const balanceRes = await fetch(`/api/tenant/balance?leaseId=${leaseData.id}`)
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json()
        setBalance(balanceData.balance || 0)
      }

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json()
        setTransactions(transactionsData)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (!phoneNumber) {
      setError('Please enter your phone number')
      return
    }

    setPaymentLoading(true)
    setError('')

    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          phone_number: phoneNumber,
          gateway,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Payment initiation failed')
      }

      alert('Payment initiated! Please check your phone to complete the payment.')
      setAmount('')
      setPhoneNumber('')

      // Refresh data after a few seconds
      setTimeout(() => {
        fetchDashboardData()
      }, 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPaymentLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tenant Dashboard</h1>
        <p className="text-gray-600">Welcome back!</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Current Balance</CardDescription>
            <CardTitle className={`text-3xl ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(balance)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Monthly Rent</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(lease?.monthly_rent || 0)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Rent Due Date</CardDescription>
            <CardTitle className="text-3xl">
              {lease?.rent_due_date || 'N/A'}
              <span className="text-lg text-gray-500">
                {lease?.rent_due_date === 1 ? 'st' :
                 lease?.rent_due_date === 2 ? 'nd' :
                 lease?.rent_due_date === 3 ? 'rd' : 'th'}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Property Info */}
      {lease && (
        <Card>
          <CardHeader>
            <CardTitle>Your Unit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Property:</span>
                <span className="font-medium">{lease.unit?.property?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Address:</span>
                <span className="font-medium">{lease.unit?.property?.address || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Unit:</span>
                <span className="font-medium">{lease.unit?.unit_number || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Make a Payment</CardTitle>
          <CardDescription>Pay rent using MTN Mobile Money or Airtel Money</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (UGX)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="0"
                  step="1"
                />
                {balance > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-1 p-0 h-auto"
                    onClick={() => setAmount(balance.toString())}
                  >
                    Pay full balance ({formatCurrency(balance)})
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor="gateway">Payment Method</Label>
                <Select value={gateway} onValueChange={(value: any) => setGateway(value)}>
                  <SelectTrigger id="gateway">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                    <SelectItem value="airtel">Airtel Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="256XXXXXXXXX"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter number in format: 256XXXXXXXXX (without +)
              </p>
            </div>

            <Button type="submit" disabled={paymentLoading} className="w-full">
              {paymentLoading ? 'Processing...' : 'Initiate Payment'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent rent payments and charges</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded-md"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {transaction.transaction_type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString('en-UG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.transaction_type === 'payment' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'payment' ? '-' : '+'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <p className="text-sm text-gray-500">
                      Balance: {formatCurrency(transaction.balance_after)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
