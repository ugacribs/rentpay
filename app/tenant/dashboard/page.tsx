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
        // Transactions come newest-first, calculate running balances
        // First reverse to oldest-first for calculation
        const oldestFirst = [...transactionsData].reverse()
        
        // Start with opening balance from lease
        const openingBalance = leaseData.opening_balance || 0
        let runningBalance = openingBalance
        
        // Create opening balance entry if there is one
        const allEntries: any[] = []
        if (openingBalance > 0) {
          // Use signed_at (when tenant signed) or updated_at (when lease was last modified)
          // as this better reflects when the tenant's account was opened
          const openingBalanceDate = leaseData.signed_at || leaseData.updated_at || leaseData.created_at
          allEntries.push({
            id: 'opening-balance',
            created_at: openingBalanceDate,
            transaction_type: 'opening_balance',
            description: 'Opening balance brought forward',
            amount: openingBalance,
            calculated_balance: openingBalance
          })
        }
        
        // Calculate running balances for actual transactions
        const withBalances = oldestFirst.map((tx: any) => {
          const txType = tx.type || 'charge'
          const amount = Math.abs(tx.amount || 0)
          // Charges/fees add to balance (what tenant owes)
          // Payments reduce balance
          if (txType === 'payment') {
            runningBalance -= amount
          } else {
            runningBalance += amount
          }
          return { ...tx, calculated_balance: runningBalance }
        })
        
        // Combine and reverse back to newest-first for display
        setTransactions([...allEntries, ...withBalances].reverse())
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

    const normalizePhone = (input: string) => {
      const digits = input.replace(/\D/g, '')
      if (digits.startsWith('0') && digits.length === 10) {
        return `256${digits.slice(1)}`
      }
      if (digits.startsWith('256') && digits.length === 12) {
        return digits
      }
      return null
    }

    const normalizedPhone = normalizePhone(phoneNumber)
    if (!normalizedPhone) {
      setError('Enter phone as 07XXXXXXXX (we will format it)')
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
          phone_number: normalizedPhone,
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

  // Helper to format description with dates
  const formatDescription = (transaction: any) => {
    const txType = transaction.type || 'charge'
    const txDate = new Date(transaction.created_at)
    
    // Format date as DD/MM/YYYY
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    
    // Get end of month for the transaction date
    const endOfMonth = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 0)
    
    // Get start of next month for rent charges
    const startOfNextMonth = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 1)
    const endOfNextMonth = new Date(txDate.getFullYear(), txDate.getMonth() + 2, 0)
    
    if (txType === 'prorated_rent') {
      return `Prorated rent for period ${formatDate(txDate)} to ${formatDate(endOfMonth)}`
    } else if (txType === 'rent') {
      return `Monthly rent for ${startOfNextMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} (${formatDate(startOfNextMonth)} to ${formatDate(endOfNextMonth)})`
    } else if (txType === 'late_fee') {
      return `Late payment fee`
    } else if (txType === 'payment') {
      return transaction.description || 'Payment received'
    } else if (txType === 'opening_balance') {
      return 'Opening balance brought forward'
    }
    
    return transaction.description || txType.replace(/_/g, ' ')
  }

  const formatDateTime = (value: string | Date) => {
    const d = value instanceof Date ? value : new Date(value)
    return d.toLocaleString('en-UG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 pb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{getGreeting()}{tenantName ? `, ${tenantName}` : ''} 👋</h1>
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
      </div>

      {/* Sticky Balance Card */}
      <div className="sticky top-0 z-10 px-4 -mt-4">
        <Card className="bg-white text-gray-900 shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Current Balance</p>
                <p className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(balance)}
                </p>
                <p className="text-gray-500 text-xs">
                  {balance > 0 ? 'Amount due' : balance < 0 ? 'Credit balance' : 'All paid up! 🎉'}
                </p>
              </div>

              {balance > 0 && (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowPayment(true)}
                >
                  Pay Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setShowPayment(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-lg font-semibold">Make a Payment</h2>
                <p className="text-sm text-gray-500">Pay via Mobile Money</p>
              </div>
              <button 
                onClick={() => setShowPayment(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-4">
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
                    placeholder="07XXXXXXXX"
                    className="mt-1"
                  />
                </div>

                <Button type="submit" disabled={paymentLoading} className="w-full">
                  {paymentLoading ? 'Processing...' : 'Pay'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="p-4 pt-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
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
                      const txType = transaction.type || 'charge'
                      const isPayment = txType === 'payment'
                      const isCredit = isPayment
                      const amount = Math.abs(transaction.amount || 0)
                      const runningBalance = transaction.calculated_balance ?? 0
                      
                      return (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-600 whitespace-nowrap">
                            {formatDateTime(transaction.created_at)}
                          </td>
                          <td className="p-3">
                            {formatDescription(transaction)}
                          </td>
                          <td className="p-3 text-right text-red-600 font-medium">
                            {!isCredit ? formatCurrency(amount) : '-'}
                          </td>
                          <td className="p-3 text-right text-green-600 font-medium">
                            {isCredit ? formatCurrency(amount) : '-'}
                          </td>
                          <td className={`p-3 text-right font-semibold ${
                            runningBalance > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(runningBalance)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
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
