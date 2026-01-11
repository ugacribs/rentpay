'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function PropertyDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchProperty()
    }
  }, [params.id])

  const fetchProperty = async () => {
    try {
      const response = await fetch(`/api/landlord/properties/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProperty(data)
      } else {
        setError('Property not found')
      }
    } catch (err) {
      setError('Failed to load property')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      vacant: 'bg-green-100 text-green-800',
      occupied: 'bg-blue-100 text-blue-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Property Details</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Property Details</h1>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-500 mb-4">{error || 'Property not found'}</p>
            <Button variant="outline" onClick={() => router.push('/landlord/properties')}>
              Back to Properties
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const vacantUnits = property.units?.filter((u: any) => u.status === 'vacant').length || 0
  const occupiedUnits = property.units?.filter((u: any) => u.status === 'occupied').length || 0

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <Button variant="ghost" className="mb-2" onClick={() => router.push('/landlord/properties')}>
            &larr; Back to Properties
          </Button>
          <h1 className="text-3xl font-bold">{property.name}</h1>
          <p className="text-gray-600">{property.address}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/landlord/properties/${params.id}/edit`}>Edit Property</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Units</CardDescription>
            <CardTitle className="text-2xl">{property.units?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Vacant Units</CardDescription>
            <CardTitle className="text-2xl text-green-600">{vacantUnits}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Occupied Units</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{occupiedUnits}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Units</CardTitle>
            <CardDescription>All units in this property</CardDescription>
          </div>
          <Button asChild>
            <Link href={`/landlord/properties/${params.id}/units/new`}>Add Unit</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!property.units || property.units.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No units yet. Add your first unit.</p>
          ) : (
            <div className="space-y-4">
              {property.units.map((unit: any) => (
                <div key={unit.id} className="flex justify-between items-center border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium">Unit {unit.unit_number}</p>
                    {unit.description && (
                      <p className="text-sm text-gray-500">{unit.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(unit.status)}
                    {unit.status === 'vacant' && (
                      <Button size="sm" asChild>
                        <Link href={`/landlord/leases/new?unitId=${unit.id}`}>Create Lease</Link>
                      </Button>
                    )}
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
