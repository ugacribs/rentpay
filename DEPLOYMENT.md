# RentPay Deployment Guide

This guide covers deploying the RentPay application to production.

## Prerequisites

- Hostinger VPS or Cloud hosting with dedicated IP
- Domain name configured with SSL certificate
- Supabase account with production project
- MTN Mobile Money API credentials (production)
- Airtel Money API credentials (production)
- Email service account (Resend or SendGrid)

## 1. Supabase Setup

### 1.1 Create Production Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Save your project URL and keys:
   - Project URL: `https://yourproject.supabase.co`
   - Anon/Public Key
   - Service Role Key (keep secret!)

### 1.2 Run Database Migrations

```bash
# Connect to your production Supabase project
supabase link --project-ref your-project-ref

# Push migrations to production
supabase db push

# Verify migrations
supabase db diff
```

### 1.3 Create Storage Bucket

1. Go to Storage in Supabase Dashboard
2. Create a new bucket named `tenant-documents`
3. Set it to **private** (not public)
4. Add RLS policies:

```sql
-- Allow tenants to upload their own documents
CREATE POLICY "Tenants can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow tenants to view their own documents
CREATE POLICY "Tenants can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow landlords to view all documents
CREATE POLICY "Landlords can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-documents' AND
  EXISTS (
    SELECT 1 FROM properties
    WHERE landlord_id = auth.uid()
  )
);
```

### 1.4 Configure Authentication

1. Go to Authentication > Email Templates
2. Customize email templates (optional)
3. Go to Authentication > URL Configuration
4. Add your production URL: `https://yourdomain.com`
5. Add redirect URLs:
   - `https://yourdomain.com/tenant/auth/callback`
   - `https://yourdomain.com/landlord/auth/callback`
   - `http://localhost:3001/tenant/auth/callback` (for development)
   - `http://localhost:3001/landlord/auth/callback` (for development)

## 2. Deploy Edge Functions

### 2.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 2.2 Deploy Functions

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy daily-billing
supabase functions deploy late-fees
supabase functions deploy rent-reminders
```

### 2.3 Set Up Cron Jobs

In your Supabase Dashboard:

1. Go to Database > Extensions
2. Enable `pg_cron` extension
3. Run this SQL to schedule the functions:

```sql
-- Daily billing: Runs at 00:01 every day
SELECT cron.schedule(
  'daily-billing',
  '1 0 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://yourproject.supabase.co/functions/v1/daily-billing',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);

-- Late fees: Runs at 00:01 every day
SELECT cron.schedule(
  'late-fees',
  '1 0 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://yourproject.supabase.co/functions/v1/late-fees',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);

-- Rent reminders: Runs at 08:00 every day
SELECT cron.schedule(
  'rent-reminders',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://yourproject.supabase.co/functions/v1/rent-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

**Important:** Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key!

### 2.4 Verify Cron Jobs

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## 3. Hostinger VPS Deployment

### 3.1 Connect to VPS via SSH

```bash
ssh root@your-server-ip
```

### 3.2 Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3.3 Install Git and Clone Repository

```bash
# Install Git
sudo apt-get update
sudo apt-get install git

# Clone your repository
cd /var/www
git clone https://github.com/yourusername/rentpay.git
cd rentpay
```

### 3.4 Install Dependencies

```bash
npm install
```

### 3.5 Set Up Environment Variables

```bash
# Create production .env.local file
nano .env.local
```

Add the following (replace with your actual values):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# MTN Mobile Money (Production)
MTN_API_URL=https://proxy.momoapi.mtn.com
MTN_COLLECTION_USER_ID=your_production_user_id
MTN_COLLECTION_API_KEY=your_production_api_key
MTN_COLLECTION_SUBSCRIPTION_KEY=your_production_subscription_key
MTN_WEBHOOK_SECRET=your_webhook_secret

# Airtel Money (Production)
AIRTEL_API_URL=https://openapi.airtel.africa
AIRTEL_CLIENT_ID=your_production_client_id
AIRTEL_CLIENT_SECRET=your_production_client_secret
AIRTEL_WEBHOOK_SECRET=your_webhook_secret

# Email Service (choose one)
# Option 1: Resend
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# Option 2: SendGrid
# SENDGRID_API_KEY=your_sendgrid_api_key
# EMAIL_FROM=noreply@yourdomain.com
```

Save and exit (Ctrl + X, then Y, then Enter)

### 3.6 Build the Application

```bash
npm run build
```

### 3.7 Install and Configure PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name "rentpay" -- start

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Follow the instructions shown by the command above
```

### 3.8 Configure Nginx

```bash
# Install Nginx
sudo apt-get install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/rentpay
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/rentpay /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 3.9 Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts and select option 2 (Redirect HTTP to HTTPS)
```

The certificate will auto-renew. Verify with:

```bash
sudo certbot renew --dry-run
```

## 4. Configure Payment Gateways

### 4.1 MTN Mobile Money

1. Log in to [MTN MoMo Developer Portal](https://momodeveloper.mtn.com)
2. Go to your Collections product
3. Set Callback URL: `https://yourdomain.com/api/webhooks/mtn`
4. Get your production credentials
5. Update `.env.local` with production values

### 4.2 Airtel Money

1. Contact Airtel Money support for production credentials
2. Provide your callback URL: `https://yourdomain.com/api/webhooks/airtel`
3. Get production API credentials
4. Update `.env.local` with production values

## 5. Initial Setup

### 5.1 Create Property and Units

Connect to your Supabase database and run:

```sql
-- Create your property
INSERT INTO properties (landlord_id, name, address)
VALUES ('your-user-id-from-auth', 'Your Property Name', 'Property Address');

-- Get the property ID
SELECT id FROM properties WHERE name = 'Your Property Name';

-- Create units (adjust as needed)
INSERT INTO units (property_id, unit_number, status)
VALUES
  ('property-id-from-above', '101', 'vacant'),
  ('property-id-from-above', '102', 'vacant'),
  ('property-id-from-above', '103', 'vacant');
```

### 5.2 Create Landlord Account

1. Go to `https://yourdomain.com/landlord/login`
2. Enter your email
3. Click "Send Login Code"
4. Check your email and enter the OTP
5. You'll be redirected to the dashboard

## 6. Monitoring and Maintenance

### 6.1 View Application Logs

```bash
# View PM2 logs
pm2 logs rentpay

# View last 100 lines
pm2 logs rentpay --lines 100
```

### 6.2 Restart Application

```bash
# After making changes
cd /var/www/rentpay
git pull
npm install
npm run build
pm2 restart rentpay
```

### 6.3 Monitor Edge Functions

In Supabase Dashboard:
- Go to Edge Functions
- Click on each function to view logs
- Check for errors and performance

### 6.4 Database Backups

Supabase automatically backs up your database daily. To create manual backup:

```bash
# Using Supabase CLI
supabase db dump -f backup.sql
```

## 7. Testing Checklist

- [ ] Landlord can log in
- [ ] Landlord can create a lease
- [ ] Tenant receives access code email
- [ ] Tenant can sign up with access code
- [ ] Tenant can select rent due date
- [ ] Tenant can sign lease
- [ ] Prorated rent is calculated correctly
- [ ] Tenant can upload ID
- [ ] Tenant dashboard shows correct balance
- [ ] Payment initiation works (MTN/Airtel)
- [ ] Webhooks receive payment notifications
- [ ] Balance updates after payment
- [ ] Daily billing runs correctly
- [ ] Late fees are charged correctly
- [ ] Rent reminders are sent

## 8. Troubleshooting

### Application won't start
```bash
pm2 logs rentpay
# Check for errors in logs
```

### Database connection issues
- Verify Supabase URL and keys in `.env.local`
- Check Supabase project status in dashboard

### Payment webhooks not working
- Verify callback URLs in MTN/Airtel dashboards
- Check webhook signature verification
- View logs: `pm2 logs rentpay | grep webhook`

### Edge Functions not running
- Check cron jobs: `SELECT * FROM cron.job;`
- View function logs in Supabase Dashboard
- Manually trigger: `SELECT net.http_post(...)`

## Support

For issues or questions:
- Check application logs: `pm2 logs`
- Check Supabase logs in dashboard
- Review error messages carefully
- Ensure all environment variables are set correctly
