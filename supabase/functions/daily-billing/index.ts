// Daily Billing Edge Function
// This runs every day at 00:01 to charge rent for tenants whose due date is tomorrow
// Schedule: 0 1 * * * (runs at 00:01 UTC every day)
//
// IMPORTANT: Monthly rent is charged on the day BEFORE the due date.
// For new tenants with prorated rent, the first monthly rent charge is skipped
// (prorated rent already covers that period). The first_billing_date column
// tracks when monthly billing should start.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current date info
    const now = new Date()
    const today = now.toISOString().split('T')[0] // YYYY-MM-DD format
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDay = tomorrow.getDate()

    console.log(`Running daily billing for leases with due date: ${tomorrowDay}`)
    console.log(`Today's date: ${today}`)

    // Find all active leases where:
    // 1. rent_due_date matches tomorrow's day
    // 2. prorated_rent_charged is true (tenant has completed signup)
    // 3. first_billing_date is null OR today >= first_billing_date
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, monthly_rent, tenant_id, rent_due_date, first_billing_date')
      .eq('status', 'active')
      .eq('rent_due_date', tomorrowDay)
      .eq('prorated_rent_charged', true)

    if (leasesError) {
      console.error('Error fetching leases:', leasesError)
      throw leasesError
    }

    console.log(`Found ${leases?.length || 0} leases to check for billing`)

    const results = {
      total: leases?.length || 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Charge rent for each lease
    for (const lease of leases || []) {
      try {
        console.log(`Checking lease ${lease.id} for billing`)

        // Check if we should skip this billing cycle (first_billing_date hasn't arrived yet)
        if (lease.first_billing_date) {
          const firstBillingDate = new Date(lease.first_billing_date)
          const todayDate = new Date(today)

          if (todayDate < firstBillingDate) {
            console.log(`Skipping lease ${lease.id} - first billing date is ${lease.first_billing_date}, today is ${today}`)
            results.skipped++
            continue
          }
        }

        console.log(`Charging rent for lease ${lease.id}`)

        // Compute billing period: tomorrow through the day before next month's same date
        const billingDate = new Date(today)
        const periodStart = new Date(billingDate)
        periodStart.setDate(periodStart.getDate() + 1)
        const periodEnd = new Date(periodStart)
        periodEnd.setMonth(periodEnd.getMonth() + 1)
        periodEnd.setDate(periodEnd.getDate() - 1)

        const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

        const { error: chargeError } = await supabase
          .from('transactions')
          .insert({
            lease_id: lease.id,
            type: 'rent',
            amount: lease.monthly_rent,
            description: `Monthly rent for period ${formatDate(periodStart)} to ${formatDate(periodEnd)}`,
            transaction_date: today,
          })

        if (chargeError) {
          console.error(`Error charging lease ${lease.id}:`, chargeError)
          results.failed++
          results.errors.push(`Lease ${lease.id}: ${chargeError.message}`)
        } else {
          console.log(`Successfully charged lease ${lease.id}`)
          results.successful++
        }
      } catch (error: any) {
        console.error(`Exception charging lease ${lease.id}:`, error)
        results.failed++
        results.errors.push(`Lease ${lease.id}: ${error.message}`)
      }
    }

    console.log('Daily billing complete:', results)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily billing completed',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Daily billing error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
