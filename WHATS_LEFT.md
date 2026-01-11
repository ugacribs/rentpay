# What's Left to Complete

## ✅ Completed

### Core Application
- ✅ Database schema and migrations
- ✅ Authentication system (email OTP)
- ✅ Landlord portal (login, dashboard, lease creation)
- ✅ Tenant portal (signup, onboarding, dashboard)
- ✅ Payment integration (MTN & Airtel with placeholders)
- ✅ Digital lease signing with signature
- ✅ Prorated rent calculation
- ✅ ID document upload functionality
- ✅ Transaction ledger system
- ✅ Email queue system

### Automated Jobs
- ✅ Daily billing (charges rent at 00:01)
- ✅ Late fees (charges 6 days after due date)
- ✅ Rent reminders (3 days, 1 day, and on due date)
- ✅ Email sender (processes email queue every 5 minutes)

### Documentation
- ✅ README.md
- ✅ DEPLOYMENT.md
- ✅ EMAIL_SETUP.md

## 🔄 Remaining Tasks

### 1. Email Service Integration (REQUIRED for Production)

**Current Status**: Emails are queued and logged to console only

**What to do**:
- Sign up for Resend or SendGrid
- Get API key
- Update `supabase/functions/email-sender/index.ts`
- Set environment variable in Supabase
- Deploy updated function

**Priority**: HIGH
**Time**: ~30 minutes
**See**: [EMAIL_SETUP.md](EMAIL_SETUP.md)

### 2. Payment Gateway Credentials (REQUIRED for Production)

**Current Status**: Using placeholder/sandbox credentials

**What to do**:

**MTN Mobile Money**:
1. Complete MTN MoMo onboarding at [momodeveloper.mtn.com](https://momodeveloper.mtn.com)
2. Get production credentials
3. Update callback URL: `https://yourdomain.com/api/webhooks/mtn`
4. Update `.env.local` with production values:
   ```env
   MTN_API_URL=https://proxy.momoapi.mtn.com
   MTN_COLLECTION_USER_ID=production_user_id
   MTN_COLLECTION_API_KEY=production_api_key
   MTN_COLLECTION_SUBSCRIPTION_KEY=production_subscription_key
   MTN_WEBHOOK_SECRET=production_webhook_secret
   ```

**Airtel Money**:
1. Contact Airtel Money Uganda for merchant account
2. Get production API credentials
3. Register callback URL: `https://yourdomain.com/api/webhooks/airtel`
4. Update `.env.local` with production values:
   ```env
   AIRTEL_API_URL=https://openapi.airtel.africa
   AIRTEL_CLIENT_ID=production_client_id
   AIRTEL_CLIENT_SECRET=production_client_secret
   AIRTEL_WEBHOOK_SECRET=production_webhook_secret
   ```

**Priority**: HIGH
**Time**: Depends on approval process (usually 1-2 weeks)

### 3. Initial Data Setup

**What to do**:
```sql
-- 1. Create your property
INSERT INTO properties (landlord_id, name, address)
VALUES (
  'your-auth-user-id',  -- Get from auth.users table
  'Property Name',
  'Full Property Address'
);

-- 2. Create units
INSERT INTO units (property_id, unit_number, status)
VALUES
  ('property-id-from-above', '101', 'vacant'),
  ('property-id-from-above', '102', 'vacant'),
  ('property-id-from-above', '103', 'vacant');
  -- Add more as needed
```

**Priority**: HIGH (before first use)
**Time**: ~10 minutes

### 4. SSL Certificate Setup

**What to do**:
```bash
# On Hostinger VPS
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Priority**: HIGH (required for production)
**Time**: ~5 minutes
**See**: [DEPLOYMENT.md](DEPLOYMENT.md)

### 5. Deploy to Production

**What to do**:
1. Follow deployment guide in [DEPLOYMENT.md](DEPLOYMENT.md)
2. Set up VPS
3. Configure Nginx
4. Deploy application with PM2
5. Set up SSL

**Priority**: HIGH
**Time**: ~2-3 hours

## 🎯 Optional Enhancements (Future)

### Features
- [ ] Landlord can view all tenants and their balances
- [ ] Landlord can manually adjust ledger (add credits/debits)
- [ ] Landlord can archive/delete tenants
- [ ] Tenant can view payment history with filters
- [ ] Tenant can download receipts as PDF
- [ ] Multi-property support (for multiple landlords)
- [ ] SMS notifications in addition to email
- [ ] WhatsApp notifications
- [ ] Support for utilities billing (water, electricity)
- [ ] Deposit management
- [ ] Maintenance request system
- [ ] Lease renewal workflow
- [ ] Export reports to Excel/CSV

### Technical Improvements
- [ ] Add comprehensive error logging (Sentry)
- [ ] Add analytics (Google Analytics, Plausible)
- [ ] Implement rate limiting on APIs
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Set up automated testing (Jest, Playwright)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Implement database backups automation
- [ ] Add monitoring and alerting (UptimeRobot, Better Uptime)
- [ ] Optimize images with Next.js Image component
- [ ] Add PWA support for mobile

### UI/UX Improvements
- [ ] Dark mode toggle
- [ ] Multi-language support (English, Luganda, Swahili)
- [ ] Print-friendly lease documents
- [ ] Mobile app (React Native)
- [ ] Add loading skeletons
- [ ] Improve error messages
- [ ] Add success animations
- [ ] Add onboarding tour for first-time users

## 📋 Testing Checklist (Before Launch)

- [ ] Landlord can log in
- [ ] Landlord can create a lease
- [ ] Tenant receives access code email
- [ ] Tenant can sign up with access code
- [ ] Tenant can select rent due date (1-31)
- [ ] Tenant can sign lease with signature
- [ ] Prorated rent is calculated correctly
- [ ] Tenant can upload ID document
- [ ] Tenant dashboard shows correct balance
- [ ] Tenant can initiate MTN payment
- [ ] Tenant can initiate Airtel payment
- [ ] Payment webhook updates balance correctly
- [ ] Daily billing charges rent correctly
- [ ] Late fees are applied correctly (6 days after due date)
- [ ] Rent reminders are sent (3 days, 1 day, on due date)
- [ ] Emails are sent successfully
- [ ] All pages are responsive (mobile + desktop)
- [ ] No console errors in browser
- [ ] Database queries are performant
- [ ] SSL certificate is valid
- [ ] Environment variables are set correctly

## 🚀 Launch Checklist

- [ ] Email service configured (Resend/SendGrid)
- [ ] Payment gateway credentials updated (MTN & Airtel)
- [ ] Property and units created in database
- [ ] Application deployed to Hostinger VPS
- [ ] SSL certificate installed
- [ ] Domain pointing to VPS IP
- [ ] Edge Functions deployed to Supabase
- [ ] Cron jobs scheduled in Supabase
- [ ] Database migrations applied to production
- [ ] Environment variables set on server
- [ ] PM2 running and configured to start on boot
- [ ] Nginx configured and running
- [ ] Tested end-to-end user flow
- [ ] Payment webhooks tested with sandbox
- [ ] Email notifications tested
- [ ] Monitoring set up
- [ ] Backups configured

## 📞 Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **MTN MoMo API**: https://momodeveloper.mtn.com/api-documentation
- **Airtel Money API**: Contact Airtel Money Uganda
- **Resend Docs**: https://resend.com/docs
- **SendGrid Docs**: https://docs.sendgrid.com

## ⏱️ Estimated Time to Launch

**Minimum** (with existing infrastructure):
- Email setup: 30 minutes
- Payment gateway setup: 1-2 weeks (approval time)
- Data setup: 10 minutes
- Deployment: 2-3 hours
- Testing: 2-3 hours
**Total**: ~1 day of work + payment gateway approval time

**Recommended** (including optional features):
- Add 1-2 weeks for enhancements and thorough testing
