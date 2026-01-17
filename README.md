# RentPay - Property Management System

A modern, full-stack property management web application for landlords and tenants in Uganda.

## Project Overview

**Status**: Foundation Complete - Ready for Feature Development

This is a comprehensive property management system with:
- Separate portals for landlords and tenants
- Mobile-first tenant experience, desktop-first landlord experience
- Supabase backend with PostgreSQL database
- MTN Mobile Money and Airtel Money payment integration
- Automated rent billing and late fee management
- Digital lease signing with signature capture
- Email-based authentication with OTP

## Tech Stack

### Frontend
- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui** components
- **React Hook Form** + **Zod** validation
- **TanStack Query** for data fetching
- **react-signature-canvas** for digital signatures

### Backend
- **Supabase**
  - PostgreSQL database
  - Authentication (Email OTP)
  - Row Level Security (RLS)
  - Realtime subscriptions
  - Storage for documents
  - Edge Functions for automation

### Payments
- MTN Mobile Money Collection API (Uganda)
- Airtel Money Collection API (Uganda)

### Hosting
- **Hostinger VPS/Cloud** (for dedicated IP required by payment gateways)

## What's Been Built

### ✅ Project Setup
- [x] Next.js project initialized with TypeScript
- [x] Tailwind CSS configured
- [x] Supabase client utilities (browser, server, middleware)
- [x] Environment variables template
- [x] Project structure created

### ✅ Database Schema
Complete database schema with:
- **properties** table
- **units** table (with vacant/occupied status)
- **tenants** table (extends auth.users)
- **access_codes** table (for tenant signup)
- **leases** table (with monthly rent, due dates, late fees)
- **lease_signatures** table (digital signatures)
- **tenant_id_documents** table (ID uploads)
- **transactions** table (ledger for all charges and payments)
- **payment_transactions** table (MTN/Airtel payment tracking)
- **notifications** table

### ✅ Database Functions
- `get_lease_balance(lease_id)` - Calculate current balance
- `generate_access_code()` - Generate unique 6-char codes
- `calculate_prorated_rent(lease_id, signup_date)` - Prorated rent calculation
- `charge_rent(lease_id)` - Auto-charge monthly rent
- `charge_late_fee(lease_id)` - Auto-charge late fees
- `process_daily_billing()` - Daily billing job
- `process_late_fees()` - Daily late fee job

### ✅ Row Level Security (RLS)
Complete RLS policies for:
- Landlords can only access their properties/units/leases
- Tenants can only access their own data
- Proper isolation between users

### ✅ TypeScript Types
- Complete database types generated
- Type-safe database queries

### ✅ UI Components
- Button, Card, Input, Label components (shadcn/ui)
- Utility functions for currency and date formatting

## What's Next (Remaining Work)

### 1. Authentication & Authorization
- [ ] Email OTP setup in Supabase dashboard
- [ ] Auth context provider
- [ ] Login/logout flows
- [ ] Protected routes middleware
- [ ] Role-based access control

### 2. Landlord Portal (`landlord.yourdomain.com`)
- [ ] Layout and navigation
- [ ] Dashboard (overview of units, tenants, payments)
- [ ] Property/Unit management
- [ ] **Lease creation flow**:
  - Create lease form (unit, email, rent amount, late fee, opening balance)
  - Generate access code
  - Send welcome email to tenant
- [ ] Tenant management view
- [ ] Financial reports/ledger views
- [ ] Manual ledger adjustments
- [ ] Tenant archive/delete functionality

### 3. Tenant Portal (`yourdomain.com`)
- [ ] Layout and navigation (mobile-first)
- [ ] **Signup/Onboarding flow**:
  - Email + OTP verification
  - Access code validation
  - Name input (first + last)
  - Rent due date selection
  - Digital lease signing (with signature canvas)
  - ID document upload
  - Prorated rent calculation and charge
- [ ] Dashboard showing:
  - Current balance
  - Payment history/ledger
  - Upcoming due dates
- [ ] Payment interface (MTN/Airtel)
- [ ] Notifications view

### 4. Payment Integration
- [ ] MTN Mobile Money API integration
  - Collection request
  - Status checking
  - Webhook handler
- [ ] Airtel Money API integration
  - Collection request
  - Status checking
  - Webhook handler
- [ ] Payment transaction creation
- [ ] Auto-create payment transaction record in ledger

### 5. Automation & Jobs
- [ ] Supabase Edge Function for `process_daily_billing()`
- [ ] Supabase Edge Function for `process_late_fees()`
- [ ] Supabase Edge Function for rent reminders (3 days, 1 day, day-of)
- [ ] Schedule jobs using pg_cron or external cron

### 6. Notifications
- [ ] Notification creation service
- [ ] Realtime notification delivery
- [ ] Email notifications via Supabase Auth
- [ ] Push notifications (optional - Web Push API)

### 7. File Storage
- [ ] Supabase Storage bucket for tenant ID documents
- [ ] Supabase Storage bucket for signed leases
- [ ] Upload/download handlers

### 8. Testing & Deployment
- [ ] Test all flows end-to-end
- [ ] Configure email templates in Supabase dashboard
- [ ] Set up Hostinger VPS with Node.js
- [ ] Configure domain and subdomain DNS
- [ ] Deploy application
- [ ] Set up SSL certificates
- [ ] Configure payment gateway credentials
- [ ] Set up cron jobs for automated billing

## Key Business Logic

### Prorated Rent Calculation
When a tenant signs up mid-cycle:
```
prorated_rent = (monthly_rent / days_in_signup_month) × days_until_first_due_date
```
- Charged immediately after lease signing
- No late fees applied
- No "normal" rent charge for this partial cycle

### Rent Billing Cycle
- Each tenant has their own due date (1-31)
- Billing happens at 00:01 on the day BEFORE due date
- Example: Due date = 5th → Billing date = 4th at 00:01

### Late Fees
- Rent is late if unpaid 5 days after due date
- Late fee charged at 00:01 on the 6th day
- Example: Due = 5th → Late on 10th → Fee charged 11th at 00:01

### Rent Reminders
- 3 days before due date
- 1 day before due date
- On the due date

## Database Migrations

To apply migrations to your Supabase project:

```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

Or manually run the SQL files in your Supabase SQL editor:
1. `supabase/migrations/20260107000001_initial_schema.sql`
2. `supabase/migrations/20260107000002_rls_policies.sql`
3. `supabase/migrations/20260107000003_functions.sql`

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - From Supabase dashboard
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase dashboard
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase dashboard (keep secret!)
- MTN and Airtel API credentials (placeholder for now)

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit:
- Tenant portal: `http://localhost:3001`
- Landlord portal: `http://localhost:3001/landlord`

## Payment Gateway Setup

### MTN Mobile Money (Uganda)
1. Register at [MTN Developer Portal](https://momodeveloper.mtn.com/)
2. Subscribe to Collections product
3. Get API credentials
4. Configure dedicated IP whitelist

### Airtel Money (Uganda)
1. Contact Airtel Uganda for API access
2. Get client credentials
3. Configure dedicated IP whitelist

## URL Configuration

The app uses path-based routing (not subdomains):
- Tenant portal: `yourdomain.com/tenant`
- Landlord portal: `yourdomain.com/landlord`

For local development:
- Tenant portal: `http://localhost:3001/tenant`
- Landlord portal: `http://localhost:3001/landlord`

## Project Structure

```
rentpay/
├── app/                    # Next.js app directory
│   ├── (tenant)/          # Tenant portal routes
│   ├── (landlord)/        # Landlord portal routes
│   ├── api/               # API routes
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── tenant/            # Tenant-specific components
│   ├── landlord/          # Landlord-specific components
│   └── ui/                # Shared UI components (shadcn)
├── lib/
│   ├── supabase/          # Supabase clients
│   ├── payments/          # Payment gateway integrations
│   └── utils.ts
├── types/
│   └── database.types.ts  # Generated types
├── supabase/
│   └── migrations/        # Database migrations
├── middleware.ts          # Next.js middleware
└── .env.example
```

## Next Steps for Completion

This project has a solid foundation. To complete it:

1. **Start with Authentication**: Set up Supabase Auth, create login pages
2. **Build Landlord Portal**: Create lease management first (core feature)
3. **Build Tenant Portal**: Create signup/onboarding flow
4. **Add Payment Integration**: MTN and Airtel with placeholders
5. **Set up Automation**: Edge Functions for billing and notifications
6. **Test End-to-End**: Test full user journeys
7. **Deploy**: Set up on Hostinger with dedicated IP

The database, types, and core architecture are ready. The remaining work is primarily frontend development and integration.

## Support

For issues or questions, refer to:
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

---

**Built with Next.js, Supabase, and Tailwind CSS**
