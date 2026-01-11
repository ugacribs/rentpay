import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function LandlordDashboard() {
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Units</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active Leases</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Vacant Units</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending Leases</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Set up your property management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Welcome!</strong> To get started, you need to set up your property and units.
              Go to the Supabase dashboard and run the SQL to create your property and units.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Quick Start:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Create your property and units in Supabase SQL Editor</li>
              <li>Create a lease for a tenant</li>
              <li>Tenant receives email with access code</li>
              <li>Tenant signs up and completes onboarding</li>
              <li>System auto-charges prorated rent</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
