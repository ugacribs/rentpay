'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export default function UploadIDPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [idType, setIdType] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a JPG, PNG, or PDF file')
        return
      }

      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }

      setFile(selectedFile)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!idType) {
      setError('Please select an ID type')
      return
    }

    if (!file) {
      setError('Please upload your ID document')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Convert file to base64 for upload
      const reader = new FileReader()
      reader.readAsDataURL(file)

      reader.onload = async () => {
        const base64File = reader.result as string

        const response = await fetch('/api/tenant/upload-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idType,
            fileName: file.name,
            fileData: base64File,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload ID')
        }

        // Redirect to tenant dashboard
        router.push('/tenant/dashboard')
      }

      reader.onerror = () => {
        throw new Error('Failed to read file')
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Upload ID Document</CardTitle>
          <CardDescription>
            Upload a copy of your identification document
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Accepted documents:</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• National ID</li>
              <li>• Driving Permit</li>
              <li>• Work ID or School ID</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2">
              File must be JPG, PNG, or PDF (max 5MB)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="idType">ID Type</Label>
              <Select value={idType} onValueChange={setIdType}>
                <SelectTrigger id="idType">
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_id">National ID</SelectItem>
                  <SelectItem value="driving_permit">Driving Permit</SelectItem>
                  <SelectItem value="work_id">Work ID</SelectItem>
                  <SelectItem value="school_id">School ID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="file">Upload Document</Label>
              <Input
                id="file"
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {file && (
                <p className="mt-2 text-sm text-green-600">
                  Selected: {file.name}
                </p>
              )}
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Your ID will be securely stored and used for verification purposes only.
                This completes your onboarding process.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Uploading...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
