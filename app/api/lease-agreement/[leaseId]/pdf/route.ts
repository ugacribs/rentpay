import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUser, getAuthorizedLandlord } from '@/lib/auth/auth-helpers'

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount)
}

function generateHTMLContent(lease: any): string {
  const rentDueDay = lease.rent_due_date || 1
  const propertyAddress = lease.unit?.property?.address || 'the Property'
  const unitNumber = lease.unit?.unit_number || 'N/A'
  const monthlyRent = lease.monthly_rent || 0
  const lateFee = lease.late_fee_amount || 0
  const openingBalance = lease.opening_balance || 0
  const tenantEmail = lease.tenant_email || ''
  const tenantFirstName = lease.tenant_first_name || ''
  const tenantLastName = lease.tenant_last_name || ''
  const tenantFullName = tenantFirstName && tenantLastName
    ? `${tenantFirstName} ${tenantLastName}`
    : tenantEmail
  const tenantSignature = lease.tenant_signature || null
  const landlordSignature = lease.landlord_signature_data || null
  const tenantSignedAt = lease.tenant_signed_at || lease.signed_at
  const landlordSignedAt = lease.landlord_signed_at || null

  const signedDate = lease.signed_at 
    ? new Date(lease.signed_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Not signed'
  
  const formatSignatureDate = (date: string | null) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Tenancy Agreement - ${tenantFullName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 20px; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { text-align: center; font-size: 24px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          h2 { font-size: 16px; font-weight: bold; margin-top: 15px; }
          h3 { font-size: 14px; font-weight: bold; }
          p { font-size: 12px; margin: 5px 0; }
          .property-box { background: #f0f0f0; padding: 10px; margin: 10px 0; border-left: 4px solid #666; }
          .bold { font-weight: bold; }
          .underline { text-decoration: underline; }
          .strong { font-weight: bold; }
          .space { margin: 10px 0; }
          .indent { margin-left: 20px; }
          .print-btn { 
            position: fixed; 
            top: 20px; 
            right: 20px; 
            padding: 12px 24px; 
            background: #2563eb; 
            color: white; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .print-btn:hover { background: #1d4ed8; }
          @media print {
            .print-btn { display: none; }
            body { margin: 0; padding: 15px; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
        
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="margin: 0;">TENANCY AGREEMENT</h1>
          <p style="margin: 5px 0;">Month-to-Month Tenancy</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p>This Tenancy Agreement ("Agreement") is entered into on <span class="underline bold">${signedDate}</span>, by and between <span class="bold">UgaCribs Company Limited</span> ("the Landlord") and <span class="bold">${tenantFullName}</span> of email <span class="bold">${tenantEmail}</span> ("the Tenant").</p>
        </div>

        <h2>1. PROPERTY</h2>
        <p class="indent">The Landlord agrees to rent to the Tenant and the Tenant agrees to rent from the Landlord the residential property located at:</p>
        <div class="property-box indent">
          <p class="bold">${propertyAddress}</p>
          <p>Unit: ${unitNumber}</p>
        </div>

        <h2>2. TERM</h2>
        <p class="indent">This Agreement shall be a month-to-month tenancy, commencing on the date of signing. Either party may terminate this Agreement by providing written notice of at least <span class="bold">ONE</span> month.</p>

        <h2>3. RENT</h2>
        <div class="indent">
          <p><span class="bold">3.1 Monthly Rent:</span> The Tenant agrees to pay a monthly rent of <span class="bold">${formatCurrency(monthlyRent)}</span>.</p>
          <p><span class="bold">3.2 Due Date:</span> Rent shall be due on the <span class="bold">${rentDueDay}${getOrdinalSuffix(rentDueDay)}</span> day of each month. Rent charges will be automatically added to the Tenant's account at 00:01 on the day before the due date.</p>
          <p><span class="bold">3.3 Prorated Rent:</span> Upon signing this Agreement, the Tenant will be charged a prorated amount for the period from the signing date until the first regular rent due date.</p>
          ${openingBalance > 0 ? `<p><span class="bold">3.4 Opening Balance:</span> The Tenant acknowledges an opening balance of <span class="bold">${formatCurrency(openingBalance)}</span> which is due immediately upon signing.</p>` : ''}
        </div>

        <h2>4. LATE FEES</h2>
        <div class="indent">
          <p><span class="bold">4.1 Grace Period:</span> A grace period of five (5) days after the rent due date shall be provided before late fees are assessed.</p>
          <p><span class="bold">4.2 Late Fee Amount:</span> The base late fee shall be <span class="bold">${formatCurrency(lateFee)}</span> per month.</p>
          <p><span class="bold">4.3 Payment of Late Fees:</span> Any late fees charged form part of the outstanding rent and are due for <span class="bold">IMMEDIATE</span> payment, together with the outstanding rent.</p>
          <p><span class="bold">4.4 Proportional Late Fees:</span> Late fees shall be calculated proportionally based on the outstanding balance relative to the monthly rent. For example, if the outstanding balance equals half the monthly rent, half the late fee applies; if the balance equals double the monthly rent, double the late fee applies.</p>
        </div>

        <h2>5. PAYMENT METHOD</h2>
        <p class="indent">Rent payments shall be made <span class="bold">STRICTLY</span> through the RentPay platform using mobile money via <span class="bold">MTN</span> or <span class="bold">AIRTEL</span>. Any money paid by any other means will not be recognised as rent and the Tenant is solely responsible for the loss of such money. The landlord will not accept liability for any money paid by cash or any other unauthorised means.</p>

        <h2>6. GENERAL TERMS</h2>
        <div class="indent">
          <p><span class="bold">6.1</span> The Tenant shall use the premises solely for residential purposes.</p>
          <p><span class="bold">6.2</span> The Tenant shall maintain the premises in good condition and promptly report any maintenance issues to the Landlord.</p>
          <p><span class="bold">6.3</span> The Tenant shall maintain a rubbish bin to collect their rubbish and subsequently dispose it of with <span class="bold">K.C.C.A.</span></p>
          <p><span class="bold">6.4</span> The Tenant shall have a <span class="bold">MAXIMUM</span> of <span class="bold">TWO</span> adults in the house as residents. The Tenant being one of them.</p>
          <p><span class="bold">6.5</span> This Agreement shall be governed by the laws of the Republic of Uganda.</p>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ccc;">
          <h2>SIGNATURES</h2>
          <div style="display: flex; justify-content: space-between; margin-top: 20px;">
            <div style="width: 45%; text-align: center;">
              <h3>TENANT</h3>
              ${tenantSignature 
                ? `<div style="border: 2px solid #666; padding: 10px; height: 100px; display: flex; align-items: center; justify-content: center; background: #fff;">
                    <img src="${tenantSignature}" alt="Tenant Signature" style="max-height: 80px; max-width: 100%;" />
                  </div>`
                : `<div style="border: 2px dashed #999; padding: 10px; height: 100px; display: flex; align-items: center; justify-content: center; background: #f9f9f9;">
                    <span style="color: #999;">No signature</span>
                  </div>`
              }
              <p style="margin-top: 10px;"><span class="bold">${tenantFullName}</span></p>
              ${tenantSignedAt ? `<p style="font-size: 11px; color: #666;">Signed on: ${formatSignatureDate(tenantSignedAt)}</p>` : ''}
            </div>
            <div style="width: 45%; text-align: center;">
              <h3>LANDLORD</h3>
              ${landlordSignature 
                ? `<div style="border: 2px solid #666; padding: 10px; height: 100px; display: flex; align-items: center; justify-content: center; background: #fff;">
                    <img src="${landlordSignature}" alt="Landlord Signature" style="max-height: 80px; max-width: 100%;" />
                  </div>`
                : `<div style="border: 2px dashed #999; padding: 10px; height: 100px; display: flex; align-items: center; justify-content: center; background: #f9f9f9;">
                    <span style="color: #999;">No signature</span>
                  </div>`
              }
              <p style="margin-top: 10px;"><span class="bold">For and on behalf of UgaCribs Company Limited</span></p>
              ${landlordSignedAt ? `<p style="font-size: 11px; color: #666;">Signed on: ${formatSignatureDate(landlordSignedAt)}</p>` : ''}
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params

    // Check authorization
    const user = await getUser()
    const landlord = await getAuthorizedLandlord()

    if (!user && !landlord) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get the lease with all related data
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        unit:units(
          unit_number,
          property:properties(
            name,
            address,
            landlord_id
          )
        )
      `)
      .eq('id', leaseId)
      .single()

    if (leaseError || !lease) {
      return NextResponse.json(
        { error: 'Lease not found' },
        { status: 404 }
      )
    }

    // Check authorization
    const isTenant = user && lease.tenant_id === user.id
    const isLandlord = landlord && (lease.unit as any)?.property?.landlord_id === landlord.id

    if (!isTenant && !isLandlord) {
      return NextResponse.json(
        { error: 'You do not have permission to download this agreement' },
        { status: 403 }
      )
    }

    // Get tenant details
    let tenantInfo = null
    if (lease.tenant_id) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('first_name, last_name')
        .eq('id', lease.tenant_id)
        .single()
      tenantInfo = tenantData
    }

    // Get tenant signature
    let tenantSignature = null
    const { data: signatureData } = await supabase
      .from('lease_signatures')
      .select('signature_data, signed_at')
      .eq('lease_id', leaseId)
      .single()
    tenantSignature = signatureData

    const leaseDataWithTenant = {
      ...lease,
      tenant_first_name: tenantInfo?.first_name || '',
      tenant_last_name: tenantInfo?.last_name || '',
      tenant_signature: tenantSignature?.signature_data || null,
      tenant_signed_at: tenantSignature?.signed_at || lease.signed_at,
    }

    // Generate HTML content
    const htmlContent = generateHTMLContent(leaseDataWithTenant)

    // Return as HTML that can be printed to PDF by browser
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Get lease PDF error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
