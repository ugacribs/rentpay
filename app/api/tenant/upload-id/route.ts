import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { idType, fileName, fileData } = await request.json()

    if (!idType || !fileName || !fileData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get tenant record
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', user.email)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Extract base64 data
    const base64Data = fileData.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload to Supabase Storage
    const fileExt = fileName.split('.').pop()
    const filePath = `${tenant.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('tenant-documents')
      .upload(filePath, buffer, {
        contentType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('tenant-documents')
      .getPublicUrl(filePath)

    // Save document record
    const { error: dbError } = await supabase
      .from('tenant_id_documents')
      .insert({
        tenant_id: tenant.id,
        document_type: idType,
        document_url: publicUrl,
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save document record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Upload ID error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
