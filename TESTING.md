# Testing Guide for RentPay

## Overview

This guide covers how to test your RentPay application to ensure everything works correctly.

## Types of Testing

### 1. Automated Testing (Unit & Integration Tests)

We've set up Jest and React Testing Library for automated testing.

#### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs when files change)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

#### Test Files Location

- Unit tests: `__tests__/lib/`
- Component tests: `__tests__/components/`
- Test files use `.test.ts` or `.test.tsx` extension

#### Writing New Tests

Create a new file in `__tests__/` folder:

```typescript
// Example: __tests__/lib/myfunction.test.ts
import { myFunction } from '@/lib/myfile'

describe('myFunction', () => {
  it('should do something correctly', () => {
    const result = myFunction(input)
    expect(result).toBe(expectedOutput)
  })
})
```

### 2. Manual Testing Checklist

Test the application manually by going through these scenarios:

#### Landlord Flow

1. **Login**
   - [ ] Go to `/landlord/login`
   - [ ] Enter landlord email
   - [ ] Receive magic link email
   - [ ] Click link and get redirected to dashboard

2. **Create Lease**
   - [ ] Go to "New Lease" page
   - [ ] Select vacant unit
   - [ ] Enter tenant details (email, name, rent amount, late fee)
   - [ ] Submit form
   - [ ] Verify access code is generated
   - [ ] Check that tenant receives email with access code

3. **View Dashboard**
   - [ ] See list of properties
   - [ ] See list of leases
   - [ ] Check unit statuses (vacant/occupied)

#### Tenant Flow

1. **Sign Up**
   - [ ] Go to `/tenant/signup`
   - [ ] Enter email and access code (from landlord)
   - [ ] Click magic link in email
   - [ ] Get redirected to onboarding

2. **Onboarding**
   - [ ] **Step 1**: Select rent due date (1-31)
   - [ ] See prorated rent explanation
   - [ ] **Step 2**: Review lease details
   - [ ] Sign lease with signature pad
   - [ ] **Step 3**: Upload ID document (JPG/PNG/PDF, max 5MB)
   - [ ] Complete onboarding → redirected to dashboard

3. **Make Payment**
   - [ ] See current balance on dashboard
   - [ ] Enter payment amount
   - [ ] Enter phone number (256XXXXXXXXX format)
   - [ ] Select gateway (MTN or Airtel)
   - [ ] Click "Initiate Payment"
   - [ ] Check phone for payment prompt
   - [ ] Complete payment on phone
   - [ ] Verify balance updates after payment

4. **View Transactions**
   - [ ] See transaction history
   - [ ] Verify rent charges appear
   - [ ] Verify payments are recorded
   - [ ] Check balance calculations

#### Payment Gateway Testing

**Important**: Use sandbox/test credentials first!

1. **MTN Mobile Money**
   - [ ] Test with MTN test phone number
   - [ ] Verify payment prompt received
   - [ ] Complete test payment
   - [ ] Check webhook receives callback
   - [ ] Verify transaction recorded in database

2. **Airtel Money**
   - [ ] Test with Airtel test phone number
   - [ ] Verify payment prompt received
   - [ ] Complete test payment
   - [ ] Check webhook receives callback
   - [ ] Verify transaction recorded in database

#### Automated Jobs Testing

1. **Daily Billing (runs at 00:01 daily)**
   - [ ] Manually trigger: Visit `/api/cron/daily-billing` (with proper auth)
   - [ ] Check that rent is charged for leases due today
   - [ ] Verify transactions are created

2. **Late Fees (runs at 00:01 daily)**
   - [ ] Manually trigger: Visit `/api/cron/late-fees`
   - [ ] Verify late fees charged after 5 days late
   - [ ] Check notifications sent

3. **Rent Reminders (runs at 08:00 daily)**
   - [ ] Manually trigger: Visit `/api/cron/rent-reminders`
   - [ ] Check reminders sent 3 days before
   - [ ] Check reminders sent 1 day before
   - [ ] Check reminders sent on due date

#### Email System Testing

1. **Access Code Email**
   - [ ] Create new lease
   - [ ] Check email_queue table in Supabase
   - [ ] Verify email sent to tenant
   - [ ] Check email contains access code and signup link

2. **Rent Reminders**
   - [ ] Check email_queue for reminder emails
   - [ ] Verify emails sent to tenants
   - [ ] Check email content is correct

### 3. Database Testing

Use Supabase Studio to verify data:

1. **Check Tables**
   - [ ] `properties` - Has landlord's properties
   - [ ] `units` - Units marked vacant/occupied correctly
   - [ ] `leases` - Lease status (pending/active)
   - [ ] `tenants` - Tenant records created
   - [ ] `transactions` - Charges and payments recorded
   - [ ] `payment_transactions` - Payment gateway records
   - [ ] `email_queue` - Emails queued and sent

2. **Check Functions**
   - [ ] `calculate_prorated_rent()` - Returns correct amount
   - [ ] `charge_rent()` - Creates transaction
   - [ ] `charge_late_fee()` - Adds late fee
   - [ ] `get_lease_balance()` - Calculates balance correctly

3. **Check RLS (Row Level Security)**
   - [ ] Tenants can only see their own data
   - [ ] Landlords can only see their properties/units/leases
   - [ ] Unauthorized users can't access data

### 4. Security Testing

1. **Authentication**
   - [ ] Cannot access tenant dashboard without login
   - [ ] Cannot access landlord dashboard without login
   - [ ] Magic link expires after use
   - [ ] Access code expires after 30 days

2. **Authorization**
   - [ ] Tenant A cannot view Tenant B's data
   - [ ] Landlord A cannot view Landlord B's properties
   - [ ] API routes check authentication

3. **Input Validation**
   - [ ] Phone numbers validated (MTN: 077/078/076, Airtel: 070/075)
   - [ ] Amount must be > 0
   - [ ] Rent due date must be 1-31
   - [ ] File uploads limited to 5MB
   - [ ] Email format validated

### 5. Performance Testing

1. **Page Load Times**
   - [ ] Dashboard loads within 2 seconds
   - [ ] Payment initiation responds within 3 seconds

2. **Database Queries**
   - [ ] Complex queries use indexes
   - [ ] No N+1 query issues

### 6. Browser Testing

Test in multiple browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Mobile browsers (Chrome Mobile, Safari Mobile)

## Common Issues and Solutions

### Issue: Tests failing with "Cannot find module"
**Solution**: Run `npm install` to ensure all dependencies are installed

### Issue: Payment webhook not receiving callbacks
**Solution**:
1. Check webhook URL is publicly accessible
2. Verify webhook URL registered with payment provider
3. Check server logs for errors

### Issue: Emails not sending
**Solution**:
1. Check `email_queue` table for status
2. Verify email-sender Edge Function is running
3. Check Supabase logs for errors

### Issue: RLS preventing data access
**Solution**:
1. Check user is authenticated
2. Verify user ID matches tenant_id or landlord_id
3. Review RLS policies in Supabase

## Continuous Testing

As you develop:

1. **Before committing code**: Run `npm test && npm run build`
2. **Before deploying**: Complete manual testing checklist
3. **After deploying**: Test critical flows in production
4. **Monitor**: Check Supabase logs and error tracking

## Test Coverage Goals

- [ ] Utility functions: 100%
- [ ] Payment validation: 100%
- [ ] API routes: 80%+
- [ ] Components: 70%+

Run `npm run test:coverage` to see current coverage.
