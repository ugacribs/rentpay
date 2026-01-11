// Rent Reminders Edge Function
// This runs every day at 08:00 to send rent reminder notifications
// Reminders are sent 3 days before, 1 day before, and on the due date
// Schedule: 0 8 * * * (runs at 08:00 UTC every day)

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

    // Calculate dates for reminders
    const in3Days = new Date(now)
    in3Days.setDate(in3Days.getDate() + 3)
    const in3DaysDate = in3Days.getDate()

    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.getDate()

    console.log(`Running rent reminders for dates: ${currentDay} (today), ${tomorrowDate} (tomorrow), ${in3DaysDate} (in 3 days)`)

    const results = {
      todayReminders: 0,
      tomorrowReminders: 0,
      threeDaysReminders: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Function to send reminders for a specific due date
    const sendReminders = async (dueDate: number, reminderType: 'today' | 'tomorrow' | 'in_3_days') => {
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select(`
          id,
          monthly_rent,
          rent_due_date,
          tenant:tenants(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'active')
        .eq('rent_due_date', dueDate)

      if (leasesError) {
        console.error(`Error fetching leases for ${reminderType}:`, leasesError)
        return
      }

      console.log(`Found ${leases?.length || 0} leases for ${reminderType} reminders`)

      for (const lease of leases || []) {
        try {
          // Get current balance
          const { data: balance } = await supabase.rpc('get_lease_balance', {
            lease_uuid: lease.id,
          })

          const tenant = Array.isArray(lease.tenant) ? lease.tenant[0] : lease.tenant

          // Prepare notification message
          let message = ''
          let title = ''

          switch (reminderType) {
            case 'today':
              title = 'Rent Due Today'
              message = `Hello ${tenant?.first_name}, your rent of ${formatCurrency(lease.monthly_rent)} is due today.`
              break
            case 'tomorrow':
              title = 'Rent Due Tomorrow'
              message = `Hello ${tenant?.first_name}, reminder that your rent of ${formatCurrency(lease.monthly_rent)} is due tomorrow.`
              break
            case 'in_3_days':
              title = 'Rent Due in 3 Days'
              message = `Hello ${tenant?.first_name}, your rent of ${formatCurrency(lease.monthly_rent)} is due in 3 days.`
              break
          }

          if (balance && balance > 0) {
            message += ` You currently have an outstanding balance of ${formatCurrency(balance)}.`
          }

          // Create notification record
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              tenant_id: tenant?.id,
              type: 'rent_reminder',
              title: title,
              message: message,
              read: false,
            })

          if (notificationError) {
            console.error(`Error creating notification for lease ${lease.id}:`, notificationError)
            results.failed++
            results.errors.push(`Lease ${lease.id}: ${notificationError.message}`)
          } else {
            console.log(`Created ${reminderType} reminder for lease ${lease.id}`)

            // Queue email notification
            const daysUntilDue = reminderType === 'today' ? 0 : reminderType === 'tomorrow' ? 1 : 3

            await supabase
              .from('email_queue')
              .insert({
                to_email: tenant?.email,
                subject: title,
                message: message,
                email_type: 'rent_reminder',
                metadata: {
                  monthlyRent: lease.monthly_rent,
                  dueDate: lease.rent_due_date,
                  balance: balance || 0,
                  daysUntilDue,
                },
                status: 'pending',
              })

            switch (reminderType) {
              case 'today':
                results.todayReminders++
                break
              case 'tomorrow':
                results.tomorrowReminders++
                break
              case 'in_3_days':
                results.threeDaysReminders++
                break
            }
          }
        } catch (error: any) {
          console.error(`Exception processing lease ${lease.id}:`, error)
          results.failed++
          results.errors.push(`Lease ${lease.id}: ${error.message}`)
        }
      }
    }

    // Send all three types of reminders
    await sendReminders(currentDay, 'today')
    await sendReminders(tomorrowDate, 'tomorrow')
    await sendReminders(in3DaysDate, 'in_3_days')

    console.log('Rent reminders complete:', results)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Rent reminders completed',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Rent reminders error:', error)
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

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
