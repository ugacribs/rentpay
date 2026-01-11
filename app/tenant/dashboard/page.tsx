'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'

export default function TenantDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState(0)
  const [lease, setLease] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [showPayment, setShowPayment] = useState(false)

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

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
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
      setShowPayment(false)

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

  const getDayOrdinal = (day: number) => {
    if (day === 1 || day === 21 || day === 31) return 'st'
    if (day === 2 || day === 22) return 'nd'
    if (day === 3 || day === 23) return 'rd'
    return 'th'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/20 rounded w-1/2"></div>
          <div className="h-32 bg-white/20 rounded"></div>
          <div className="h-24 bg-white/20 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 pb-24">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-blue-100 text-sm">Welcome back</p>
            <h1 className="text-xl font-bold">{lease?.unit?.property?.name || 'Your Home'}</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-white hover:bg-white/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </Button>
        </div>

        {/* Balance Card - overlapping */}
        <Card className="bg-white text-gray-900 shadow-xl -mb-20">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-1">Current Balance</p>
              <p className={`text-4xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(balance)}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {balance > 0 ? 'Amount due' : balance < 0 ? 'Credit balance' : 'All paid up! 🎉'}
              </p>
            </div>

            {balance > 0 && (
              <Button 
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowPayment(!showPayment)}
              >
                {showPayment ? 'Hide Payment' : 'Pay Now'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="p-4 pt-24 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Payment Form - Collapsible */}
        {showPayment && (
          <Card className="border-blue-200 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Make a Payment</CardTitle>
              <CardDescription>Pay via Mobile Money</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <Label htmlFor="amount" className="text-sm">Amount (UGX)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="mt-1"
                  />
                  {balance > 0 && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="mt-1 p-0 h-auto text-blue-600"
                      onClick={() => setAmount(balance.toString())}
                    >
                      Pay full balance ({formatCurrency(balance)})
                    </Button>
                  )}
                </div>

                <div>
                  <Label htmlFor="gateway" className="text-sm">Payment Method</Label>
                  <Select value={gateway} onValueChange={(value: any) => setGateway(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                      <SelectItem value="airtel">Airtel Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phoneNumber" className="text-sm">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="256XXXXXXXXX"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 256XXXXXXXXX</p>
                </div>

                <Button type="submit" disabled={paymentLoading} className="w-full">
                  {paymentLoading ? 'Processing...' : 'Initiate Payment'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Quick Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-gray-500 text-xs">Monthly Rent</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(lease?.monthly_rent || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-gray-500 text-xs">Due Date</p>
              <p className="text-xl font-bold text-gray-900">
                {lease?.rent_due_date || '-'}
                <span className="text-sm text-gray-500">
                  {lease?.rent_due_date ? getDayOrdinal(lease.rent_due_date) : ''}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Unit Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">{lease?.unit?.property?.name || 'Property'}</p>
                <p className="text-gray-500 text-sm">Unit {lease?.unit?.unit_number || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-6 text-sm">No transactions yet</p>
            ) : (
              <div className="divide-y">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex justify-between items-center p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        transaction.transaction_type === 'payment' 
                          ? 'bg-green-100' 
                          : 'bg-red-100'
                      }`}>
                        {transaction.transaction_type === 'payment' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm capitalize">
                          {transaction.transaction_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString('en-UG', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${
                        transaction.transaction_type === 'payment' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'payment' ? '-' : '+'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                      <p className="text-xs text-gray-500">
                        Bal: {formatCurrency(transaction.balance_after)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom padding for mobile */}
        <div className="h-4"></div>
      </div>
    </div>
  )
}
