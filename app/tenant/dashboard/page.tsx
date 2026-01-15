'use client'

import { useState, useEffect, useCallback } from 'react'
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
  
  // Late fee countdown timer
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Capitalize name: first letter uppercase, rest lowercase
  const capitalizeName = (name: string) => {
    if (!name) return ''
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  }

  // Calculate late fee info based on current balance and lease terms
  // Only shows after monthly rent is charged until late fee is charged or balance is paid
  const getLateFeeInfo = () => {
    if (!lease || balance <= 0) return null

    const rentDueDate = lease.rent_due_date || 1
    const lateFeeAmount = lease.late_fee_amount || 0
    const monthlyRent = lease.monthly_rent || 1

    if (lateFeeAmount <= 0) return null

    // Check if there's a monthly rent charge and no late fee after it
    // Find the most recent 'rent' transaction (not prorated_rent)
    const rentTransactions = transactions.filter((tx: any) => tx.type === 'rent')
    if (rentTransactions.length === 0) return null // No rent charged yet, don't show warning

    // Get the most recent rent charge (transactions are already sorted newest first)
    const lastRentCharge = rentTransactions[0]
    const lastRentDate = new Date(lastRentCharge.created_at)

    // Check if a late fee was charged after the last rent charge
    const lateFeeAfterRent = transactions.find((tx: any) => {
      if (tx.type !== 'late_fee') return false
      const txDate = new Date(tx.created_at)
      return txDate >= lastRentDate
    })

    // If late fee already charged for this cycle, don't show warning
    if (lateFeeAfterRent) return null

    // Calculate the proportional late fee based on outstanding balance
    const proportionalLateFee = Math.round((balance / monthlyRent) * lateFeeAmount)

    // Calculate late fee date (due date + 5 days = 6th day after due)
    const now = new Date()
    const currentDay = now.getDate()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Determine the next late fee date
    let lateFeeDay = rentDueDate + 5
    let lateFeeMonth = currentMonth
    let lateFeeYear = currentYear

    // Handle month overflow (e.g., due date 28 + 5 = 33 → next month day 2-3)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    if (lateFeeDay > daysInMonth) {
      lateFeeDay = lateFeeDay - daysInMonth
      lateFeeMonth += 1
      if (lateFeeMonth > 11) {
        lateFeeMonth = 0
        lateFeeYear += 1
      }
    }

    // If we're past the late fee day this month, it's next month's cycle
    if (currentDay > lateFeeDay || (currentDay === lateFeeDay && now.getHours() >= 1)) {
      // Move to next month
      lateFeeMonth += 1
      if (lateFeeMonth > 11) {
        lateFeeMonth = 0
        lateFeeYear += 1
      }
      // Recalculate late fee day for the new month
      lateFeeDay = rentDueDate + 5
      const nextMonthDays = new Date(lateFeeYear, lateFeeMonth + 1, 0).getDate()
      if (lateFeeDay > nextMonthDays) {
        lateFeeDay = lateFeeDay - nextMonthDays
        lateFeeMonth += 1
        if (lateFeeMonth > 11) {
          lateFeeMonth = 0
          lateFeeYear += 1
        }
      }
    }

    const lateFeeDate = new Date(lateFeeYear, lateFeeMonth, lateFeeDay, 0, 1, 0) // 00:01 UTC

    // Calculate days remaining
    const timeDiff = lateFeeDate.getTime() - now.getTime()
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

    if (daysRemaining <= 0) return null

    return {
      amount: proportionalLateFee,
      daysRemaining,
      date: lateFeeDate
    }
  }

  // Get the late fee target date for countdown
  // Only returns a date if rent is charged and late fee hasn't been charged yet
  const getLateFeeTargetDate = useCallback(() => {
    if (!lease || balance <= 0) return null

    const rentDueDate = lease.rent_due_date || 1
    const lateFeeAmount = lease.late_fee_amount || 0

    if (lateFeeAmount <= 0) return null

    // Check if there's a monthly rent charge and no late fee after it
    const rentTransactions = transactions.filter((tx: any) => tx.type === 'rent')
    if (rentTransactions.length === 0) return null

    const lastRentCharge = rentTransactions[0]
    const lastRentDate = new Date(lastRentCharge.created_at)

    const lateFeeAfterRent = transactions.find((tx: any) => {
      if (tx.type !== 'late_fee') return false
      const txDate = new Date(tx.created_at)
      return txDate >= lastRentDate
    })

    if (lateFeeAfterRent) return null

    const now = new Date()
    const currentDay = now.getDate()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let lateFeeDay = rentDueDate + 5
    let lateFeeMonth = currentMonth
    let lateFeeYear = currentYear

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    if (lateFeeDay > daysInMonth) {
      lateFeeDay = lateFeeDay - daysInMonth
      lateFeeMonth += 1
      if (lateFeeMonth > 11) {
        lateFeeMonth = 0
        lateFeeYear += 1
      }
    }

    if (currentDay > lateFeeDay || (currentDay === lateFeeDay && now.getHours() >= 1)) {
      lateFeeMonth += 1
      if (lateFeeMonth > 11) {
        lateFeeMonth = 0
        lateFeeYear += 1
      }
      lateFeeDay = rentDueDate + 5
      const nextMonthDays = new Date(lateFeeYear, lateFeeMonth + 1, 0).getDate()
      if (lateFeeDay > nextMonthDays) {
        lateFeeDay = lateFeeDay - nextMonthDays
        lateFeeMonth += 1
        if (lateFeeMonth > 11) {
          lateFeeMonth = 0
          lateFeeYear += 1
        }
      }
    }

    return new Date(lateFeeYear, lateFeeMonth, lateFeeDay, 0, 1, 0)
  }, [lease, balance, transactions])

  const [leaseTerminated, setLeaseTerminated] = useState(false)
  const [terminatedMessage, setTerminatedMessage] = useState('')

  const fetchDashboardData = useCallback(async () => {
    try {
      const [leaseRes, transactionsRes, profileRes] = await Promise.all([
        fetch('/api/tenant/lease'),
        fetch('/api/tenant/transactions'),
        fetch('/api/tenant/profile'),
      ])

      if (!leaseRes.ok) {
        const leaseError = await leaseRes.json()
        if (leaseError.code === 'LEASE_TERMINATED') {
          setLeaseTerminated(true)
          setTerminatedMessage(leaseError.error)
          setLoading(false)
          return
        }
        throw new Error('Failed to fetch lease data')
      }

      const leaseData = await leaseRes.json()
      setLease(leaseData)

      // Get tenant name from profile
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setTenantName(capitalizeName(profileData.first_name || ''))
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
          const txAmount = tx.amount || 0
          // Simply add the amount - payments and credits are already negative in DB
          // Charges/fees are positive, payments/credits are negative
          runningBalance += txAmount
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
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Countdown timer effect
  useEffect(() => {
    const targetDate = getLateFeeTargetDate()
    if (!targetDate) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()

      if (diff <= 0) {
        setCountdown(null)
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setCountdown({ days, hours, minutes, seconds })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [getLateFeeTargetDate])

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

  // Show lease terminated message
  if (leaseTerminated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-600 to-gray-800 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <CardTitle className="text-xl text-gray-800">Lease Terminated</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {terminatedMessage || 'Your lease has been terminated. Please contact your landlord for more information.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">
              If you believe this is an error, please reach out to your property manager.
            </p>
          </CardContent>
        </Card>
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

              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowPayment(true)}
              >
                Pay Now
              </Button>
            </div>
            
            {/* Late Fee Warning */}
            {(() => {
              const lateFeeInfo = getLateFeeInfo()
              if (!lateFeeInfo || !countdown) return null
              
              const pad = (n: number) => n.toString().padStart(2, '0')
              
              return (
                <div className="mt-3 pt-3 border-t border-orange-200 bg-orange-50 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-xs text-orange-800">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span><span className="font-semibold">Late fee notice:</span> A fee of{' '}
                        <span className="font-bold">{formatCurrency(lateFeeInfo.amount)}</span> will be charged if this balance remains unpaid in</span>
                        <div className="inline-flex items-center bg-gray-900 text-orange-400 font-mono text-sm px-2 py-1 rounded gap-1">
                          {countdown.days > 0 && (
                            <>
                              <span className="font-bold">{pad(countdown.days)}</span>
                              <span className="text-orange-300 text-xs">Days</span>
                              <span className="text-orange-300 mx-0.5">:</span>
                            </>
                          )}
                          {(countdown.days > 0 || countdown.hours > 0) && (
                            <>
                              <span className="font-bold">{pad(countdown.hours)}</span>
                              <span className="text-orange-300 text-xs">Hrs</span>
                              <span className="text-orange-300 mx-0.5">:</span>
                            </>
                          )}
                          {(countdown.days > 0 || countdown.hours > 0 || countdown.minutes > 0) && (
                            <>
                              <span className="font-bold">{pad(countdown.minutes)}</span>
                              <span className="text-orange-300 text-xs">Mins</span>
                              <span className="text-orange-300 mx-0.5">:</span>
                            </>
                          )}
                          <span className="font-bold">{pad(countdown.seconds)}</span>
                          <span className="text-orange-300 text-xs">Secs</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
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
                      const rawAmount = transaction.amount || 0
                      // Credits: payments OR any transaction with negative amount (e.g., adjustment credits)
                      const isCredit = txType === 'payment' || rawAmount < 0
                      const amount = Math.abs(rawAmount)
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
