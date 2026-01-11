# Email Notifications Setup

RentPay uses an email queue system that works with Supabase. Currently, emails are logged to the console in development. For production, integrate with Resend or SendGrid.

## How It Works

1. **Email Queue**: When actions require sending emails, they're added to the `email_queue` table
2. **Email Sender Edge Function**: Runs every 5 minutes to process pending emails
3. **Email Types**:
   - `access_code`: Sent when landlord creates a lease for new tenant
   - `rent_reminder`: Sent 3 days before, 1 day before, and on rent due date
   - `payment_confirmation`: Sent when tenant payment is successful
   - `late_fee_notice`: Sent when late fee is applied

## Current Setup (Development)

Emails are currently **logged to the console** only. Check Supabase Edge Function logs to see the email content.

To view emails in development:
1. Go to Supabase Dashboard
2. Navigate to Edge Functions → email-sender
3. View Logs to see email content

## Production Setup with Resend (Recommended)

### 1. Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Get your API key

### 2. Update email-sender Edge Function

Edit `supabase/functions/email-sender/index.ts` and uncomment/update the Resend section:

```typescript
// Replace the TODO section with:
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
```

### 3. Set Environment Variable

```bash
# In Supabase Dashboard → Edge Functions → Secrets
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

### 4. Deploy Updated Function

```bash
supabase functions deploy email-sender
```

### 5. Schedule the Function

Add cron job in Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'email-sender',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url:='https://yourproject.supabase.co/functions/v1/email-sender',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

## Alternative: SendGrid Setup

### 1. Get SendGrid API Key

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key
3. Verify your sender identity

### 2. Update email-sender Edge Function

```typescript
const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sendgridApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    personalizations: [{
      to: [{ email: email.to_email }]
    }],
    from: { email: 'noreply@yourdomain.com', name: 'RentPay' },
    subject: email.subject,
    content: [{
      type: 'text/plain',
      value: email.message
    }]
  })
})

if (!res.ok) {
  throw new Error(`SendGrid API error: ${await res.text()}`)
}
```

### 3. Set Environment Variable

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
```

## Email Templates

### Access Code Email
Sent when landlord creates a lease:
- Contains signup link
- Access code for tenant
- Property and unit details

### Rent Reminders
Sent automatically:
- 3 days before due date
- 1 day before due date
- On the due date

### Payment Confirmation
Sent after successful payment:
- Amount paid
- New balance
- Transaction ID

### Late Fee Notice
Sent when late fee is charged:
- Late fee amount
- Total balance
- Days overdue

## Monitoring

View email queue status:

```sql
-- Check pending emails
SELECT * FROM email_queue WHERE status = 'pending';

-- Check failed emails
SELECT * FROM email_queue WHERE status = 'failed';

-- Check sent emails (last 24 hours)
SELECT * FROM email_queue
WHERE status = 'sent'
AND sent_at > NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC;
```

## Troubleshooting

### Emails not sending

1. Check Edge Function logs:
   - Supabase Dashboard → Edge Functions → email-sender → Logs

2. Check email queue:
```sql
SELECT * FROM email_queue WHERE status = 'failed';
```

3. Verify API key is set:
   - Supabase Dashboard → Edge Functions → Secrets

4. Check cron job is running:
```sql
SELECT * FROM cron.job WHERE jobname = 'email-sender';
SELECT * FROM cron.job_run_details WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'email-sender'
) ORDER BY start_time DESC LIMIT 10;
```

### Testing Emails

Manually trigger email sender:

```sql
SELECT net.http_post(
  url:='https://yourproject.supabase.co/functions/v1/email-sender',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
) as request_id;
```

Or manually add a test email to queue:

```sql
INSERT INTO email_queue (to_email, subject, message, email_type, status)
VALUES (
  'your-email@example.com',
  'Test Email',
  'This is a test email from RentPay.',
  'rent_reminder',
  'pending'
);
```

Then wait 5 minutes or manually trigger the function.
