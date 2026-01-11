// Late Fees Edge Function
// This runs every day at 00:01 to charge late fees for overdue rent
// Late fees are charged on the 6th day after due date (5 days late)
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

    // Get current date
    const now = new Date()
    const currentDay = now.getDate()

    // Calculate what the due date was 6 days ago
    const sixDaysAgo = new Date(now)
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 5) // 5 days late = 6th day
    const targetDueDate = sixDaysAgo.getDate()

    console.log(`Running late fees for leases with due date: ${targetDueDate} (6 days ago)`)

    // Find all active leases where rent_due_date was 6 days ago
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, late_fee_amount, tenant_id, rent_due_date')
      .eq('status', 'active')
      .eq('rent_due_date', targetDueDate)

    if (leasesError) {
      console.error('Error fetching leases:', leasesError)
      throw leasesError
    }

    console.log(`Found ${leases?.length || 0} leases to check for late fees`)

    const results = {
      total: leases?.length || 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Check each lease and charge late fee if balance is positive
    for (const lease of leases || []) {
      try {
        console.log(`Checking lease ${lease.id} for late fees`)

        // Get current balance for this lease
        const { data: balance, error: balanceError } = await supabase.rpc('get_lease_balance', {
          lease_uuid: lease.id,
        })

        if (balanceError) {
          console.error(`Error getting balance for lease ${lease.id}:`, balanceError)
          results.failed++
          results.errors.push(`Lease ${lease.id}: ${balanceError.message}`)
          continue
        }

        // Only charge late fee if there's an outstanding balance
        if (balance && balance > 0) {
          console.log(`Lease ${lease.id} has balance ${balance}, charging late fee`)

          // Call the database function to charge late fee
          const { error: lateFeeError } = await supabase.rpc('charge_late_fee', {
            p_lease_id: lease.id,
          })

          if (lateFeeError) {
            console.error(`Error charging late fee for lease ${lease.id}:`, lateFeeError)
            results.failed++
            results.errors.push(`Lease ${lease.id}: ${lateFeeError.message}`)
          } else {
            console.log(`Successfully charged late fee for lease ${lease.id}`)
            results.successful++

            // TODO: Send late fee notification to tenant
            // This will be implemented when email service is integrated
          }
        } else {
          console.log(`Lease ${lease.id} has no outstanding balance, skipping late fee`)
          results.skipped++
        }
      } catch (error: any) {
        console.error(`Exception processing lease ${lease.id}:`, error)
        results.failed++
        results.errors.push(`Lease ${lease.id}: ${error.message}`)
      }
    }

    console.log('Late fees processing complete:', results)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Late fees processing completed',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Late fees error:', error)
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
