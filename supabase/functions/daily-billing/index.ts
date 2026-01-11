// Daily Billing Edge Function
// This runs every day at 00:01 to charge rent for tenants whose due date is tomorrow
// Schedule: 0 1 * * * (runs at 00:01 UTC every day)

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
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDay = tomorrow.getDate()

    console.log(`Running daily billing for leases with due date: ${tomorrowDay}`)

    // Find all active leases where rent_due_date matches tomorrow's day
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, monthly_rent, tenant_id, rent_due_date')
      .eq('status', 'active')
      .eq('rent_due_date', tomorrowDay)

    if (leasesError) {
      console.error('Error fetching leases:', leasesError)
      throw leasesError
    }

    console.log(`Found ${leases?.length || 0} leases to bill`)

    const results = {
      total: leases?.length || 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Charge rent for each lease
    for (const lease of leases || []) {
      try {
        console.log(`Charging rent for lease ${lease.id}`)

        // Call the database function to charge rent
        const { error: chargeError } = await supabase.rpc('charge_rent', {
          p_lease_id: lease.id,
        })

        if (chargeError) {
          console.error(`Error charging lease ${lease.id}:`, chargeError)
          results.failed++
          results.errors.push(`Lease ${lease.id}: ${chargeError.message}`)
        } else {
          console.log(`Successfully charged lease ${lease.id}`)
          results.successful++

          // TODO: Send rent due notification to tenant
          // This will be implemented when email service is integrated
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
