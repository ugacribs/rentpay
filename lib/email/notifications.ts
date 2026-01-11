/**
 * Email notification helpers using Supabase
 *
 * Since we're using Supabase's built-in email, we'll store email notifications
 * in the database and trigger them via Edge Functions
 */

import { createClient } from '@/lib/supabase/server'

interface EmailNotification {
  to: string
  subject: string
  message: string
  type: 'access_code' | 'rent_reminder' | 'payment_confirmation' | 'late_fee_notice'
  metadata?: Record<string, any>
}

/**
 * Queue an email notification to be sent
 * The email will be picked up by the email-sender Edge Function
 */
export async function queueEmail(notification: EmailNotification) {
  try {
    const supabase = await createClient()

    // Insert into email_queue table (we'll create this)
    const { error } = await supabase
      .from('email_queue')
      .insert({
        to_email: notification.to,
        subject: notification.subject,
        message: notification.message,
        email_type: notification.type,
        metadata: notification.metadata || {},
        status: 'pending',
      })

    if (error) {
      console.error('Error queueing email:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Exception queueing email:', error)
    return { success: false, error }
  }
}

/**
 * Send access code email to new tenant
 */
export async function sendAccessCodeEmail(params: {
  email: string
  accessCode: string
  propertyName: string
  unitNumber: string
}) {
  const { email, accessCode, propertyName, unitNumber } = params

  const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tenant/signup?email=${encodeURIComponent(email)}`

  const message = `
Hello,

Welcome to RentPay! Your landlord has created a lease for you at ${propertyName}, Unit ${unitNumber}.

To get started, please follow these steps:

1. Visit the signup page: ${signupUrl}
2. Enter your email: ${email}
3. Use your access code: ${accessCode}
4. Complete your profile and sign the lease agreement

Your access code expires in 30 days.

If you have any questions, please contact your landlord.

Best regards,
RentPay Team
  `.trim()

  return queueEmail({
    to: email,
    subject: 'Welcome to RentPay - Complete Your Lease Setup',
    message,
    type: 'access_code',
    metadata: {
      accessCode,
      propertyName,
      unitNumber,
      signupUrl,
    },
  })
}

/**
 * Send rent reminder email
 */
export async function sendRentReminderEmail(params: {
  email: string
  firstName: string
  monthlyRent: number
  dueDate: number
  balance: number
  daysUntilDue: number
}) {
  const { email, firstName, monthlyRent, dueDate, balance, daysUntilDue } = params

  let subject = ''
  let urgency = ''

  if (daysUntilDue === 0) {
    subject = 'Rent Due Today - RentPay'
    urgency = 'today'
  } else if (daysUntilDue === 1) {
    subject = 'Rent Due Tomorrow - RentPay'
    urgency = 'tomorrow'
  } else {
    subject = `Rent Due in ${daysUntilDue} Days - RentPay`
    urgency = `in ${daysUntilDue} days`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  let balanceInfo = ''
  if (balance > 0) {
    balanceInfo = `\n\nYou currently have an outstanding balance of ${formatCurrency(balance)}.`
  }

  const message = `
Hello ${firstName},

This is a reminder that your rent of ${formatCurrency(monthlyRent)} is due ${urgency}.

Your rent is due on the ${dueDate}${dueDate === 1 ? 'st' : dueDate === 2 ? 'nd' : dueDate === 3 ? 'rd' : 'th'} of each month.${balanceInfo}

Please log in to your RentPay dashboard to make a payment:
${process.env.NEXT_PUBLIC_APP_URL}/tenant/dashboard

Payment Methods Available:
- MTN Mobile Money
- Airtel Money

Late fees will apply if payment is not received within 5 days after the due date.

Thank you for your prompt payment.

Best regards,
RentPay Team
  `.trim()

  return queueEmail({
    to: email,
    subject,
    message,
    type: 'rent_reminder',
    metadata: {
      monthlyRent,
      dueDate,
      balance,
      daysUntilDue,
    },
  })
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(params: {
  email: string
  firstName: string
  amount: number
  transactionId: string
  newBalance: number
}) {
  const { email, firstName, amount, transactionId, newBalance } = params

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amt)
  }

  const message = `
Hello ${firstName},

Your payment has been received successfully!

Payment Details:
- Amount Paid: ${formatCurrency(amount)}
- Transaction ID: ${transactionId}
- New Balance: ${formatCurrency(newBalance)}
- Date: ${new Date().toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' })}

You can view your complete transaction history in your dashboard:
${process.env.NEXT_PUBLIC_APP_URL}/tenant/dashboard

Thank you for your payment!

Best regards,
RentPay Team
  `.trim()

  return queueEmail({
    to: email,
    subject: 'Payment Received - RentPay',
    message,
    type: 'payment_confirmation',
    metadata: {
      amount,
      transactionId,
      newBalance,
    },
  })
}

/**
 * Send late fee notice email
 */
export async function sendLateFeeNoticeEmail(params: {
  email: string
  firstName: string
  lateFeeAmount: number
  totalBalance: number
  daysOverdue: number
}) {
  const { email, firstName, lateFeeAmount, totalBalance, daysOverdue } = params

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amt)
  }

  const message = `
Hello ${firstName},

This is to inform you that a late fee has been applied to your account.

Late Fee Details:
- Late Fee Amount: ${formatCurrency(lateFeeAmount)}
- Days Overdue: ${daysOverdue}
- Total Balance Due: ${formatCurrency(totalBalance)}

Please make a payment as soon as possible to avoid additional late fees.

Log in to your dashboard to make a payment:
${process.env.NEXT_PUBLIC_APP_URL}/tenant/dashboard

If you have already made a payment, please disregard this notice.

Best regards,
RentPay Team
  `.trim()

  return queueEmail({
    to: email,
    subject: 'Late Fee Applied - RentPay',
    message,
    type: 'late_fee_notice',
    metadata: {
      lateFeeAmount,
      totalBalance,
      daysOverdue,
    },
  })
}
