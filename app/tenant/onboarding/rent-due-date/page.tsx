'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function RentDueDatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dueDate, setDueDate] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dueDate) {
      setError('Please select a rent due date')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/tenant/set-due-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rent_due_date: parseInt(dueDate) }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to set due date')
      }

      router.push('/tenant/onboarding/sign-lease')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Generate days 1-31
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose Your Rent Due Date</CardTitle>
          <CardDescription>
            Select which day of the month your rent should be due
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> Once you sign the lease, you&apos;ll be charged a prorated amount
              for the days remaining until your first due date. After that, full rent will be charged
              automatically on this date each month.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="dueDate">Day of Month</Label>
              <Select value={dueDate} onValueChange={setDueDate}>
                <SelectTrigger id="dueDate">
                  <SelectValue placeholder="Select day (1-31)" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-sm text-gray-500">
                Rent will be charged at 00:01 on the day before this date
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">What happens next:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>You&apos;ll sign your lease digitally</li>
                <li>Prorated rent will be charged immediately</li>
                <li>Full rent charges on your chosen date each month</li>
                <li>Late fees apply if rent is unpaid 5 days after due date</li>
              </ol>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Continue to Lease Signing'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
