'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

export default function TenantDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState(0)
  const [lease, setLease] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [tenantName, setTenantName] = useState('')

  // Payment form
  const [amount, setAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [gateway, setGateway] = useState<'mtn' | 'airtel'>('mtn')

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [leaseRes, transactionsRes, profileRes] = await Promise.all([
        fetch('/api/tenant/lease'),
        fetch('/api/tenant/transactions'),
        fetch('/api/tenant/profile'),
      ])

      if (!leaseRes.ok) throw new Error('Failed to fetch lease data')

      const leaseData = await leaseRes.json()
      setLease(leaseData)

      // Get tenant name from profile
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setTenantName(profileData.first_name || '')
      }

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
            <p className="text-blue-100 text-sm">{getGreeting()}{tenantName ? `, ${tenantName}` : ''} 👋</p>
            <h1 className="text-xl font-bold">{lease?.unit?.property?.name || 'Your Home'}</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/tenant/profile')}
            className="text-white hover:bg-white/20 p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
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

        {/* Account Ledger */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Account Ledger</CardTitle>
            <CardDescription>Complete transaction history</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-6 text-sm">No transactions yet</p>
            ) : (
              <div className="overflow-x-auto">
                {/* Ledger Table Header */}
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Date</th>
                      <th className="text-left p-3 font-medium text-gray-600">Description</th>
                      <th className="text-right p-3 font-medium text-gray-600">Debit</th>
                      <th className="text-right p-3 font-medium text-gray-600">Credit</th>
                      <th className="text-right p-3 font-medium text-gray-600">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* Show transactions with latest first */}
                    {transactions.map((transaction) => {
                      const txType = transaction.transaction_type || 'charge'
                      const isPayment = txType === 'payment'
                      const isCredit = isPayment
                      const amount = Math.abs(transaction.amount)
                      
                      return (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-600 whitespace-nowrap">
                            {new Date(transaction.created_at).toLocaleDateString('en-UG', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="p-3 capitalize">
                            {txType.replace(/_/g, ' ')}
                            {transaction.description && (
                              <span className="text-gray-500 text-xs block">{transaction.description}</span>
                            )}
                          </td>
                          <td className="p-3 text-right text-red-600 font-medium">
                            {!isCredit ? formatCurrency(amount) : '-'}
                          </td>
                          <td className="p-3 text-right text-green-600 font-medium">
                            {isCredit ? formatCurrency(amount) : '-'}
                          </td>
                          <td className={`p-3 text-right font-semibold ${
                            transaction.balance_after > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(transaction.balance_after)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100 border-t-2">
                    <tr>
                      <td colSpan={4} className="p-3 font-semibold text-right">Current Balance:</td>
                      <td className={`p-3 text-right font-bold ${
                        balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(balance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
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
