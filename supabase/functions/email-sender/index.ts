// Email Sender Edge Function
// This runs every 5 minutes to process pending emails in the queue
// Schedule: */5 * * * * (runs every 5 minutes)

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

    console.log('Processing email queue...')

    // Get pending emails (limit to 50 per run to avoid timeouts)
    const { data: emails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3) // Max 3 attempts
      .order('created_at', { ascending: true })
      .limit(50)

    if (fetchError) {
      console.error('Error fetching emails:', fetchError)
      throw fetchError
    }

    console.log(`Found ${emails?.length || 0} pending emails`)

    const results = {
      total: emails?.length || 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Process each email
    for (const email of emails || []) {
      try {
        console.log(`Sending email ${email.id} to ${email.to_email}`)

        // Since Supabase doesn't have a direct custom email API,
        // we'll use a workaround: create a temporary notification
        // and log the email for manual sending OR integrate with a service

        // For now, we'll log it and mark as sent
        // In production, integrate with Resend/SendGrid here

        console.log(`
          =====================================
          TO: ${email.to_email}
          SUBJECT: ${email.subject}
          MESSAGE:
          ${email.message}
          =====================================
        `)

        // TODO: Replace with actual email service
        // Example with Resend:
        /*
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'RentPay <noreply@yourdomain.com>',
            to: email.to_email,
            subject: email.subject,
            text: email.message,
          })
        })

        if (!res.ok) {
          throw new Error(`Resend API error: ${await res.text()}`)
        }
        */

        // For now, just mark as sent (DEVELOPMENT ONLY)
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: email.attempts + 1,
          })
          .eq('id', email.id)

        if (updateError) {
          console.error(`Error updating email ${email.id}:`, updateError)
          results.failed++
          results.errors.push(`Email ${email.id}: ${updateError.message}`)
        } else {
          console.log(`Successfully processed email ${email.id}`)
          results.sent++
        }
      } catch (error: any) {
        console.error(`Exception sending email ${email.id}:`, error)

        // Mark as failed if max attempts reached
        const newStatus = email.attempts >= 2 ? 'failed' : 'pending'

        await supabase
          .from('email_queue')
          .update({
            status: newStatus,
            attempts: email.attempts + 1,
            error_message: error.message,
          })
          .eq('id', email.id)

        results.failed++
        results.errors.push(`Email ${email.id}: ${error.message}`)
      }
    }

    console.log('Email processing complete:', results)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email processing completed',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Email sender error:', error)
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
