import { Resend } from 'resend'

let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables')
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

const FROM_EMAIL = 'Ferdy <hello@ferdy.io>'

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Error sending email:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

// Email Templates

function getEmailTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 2px solid #2563eb;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .content {
      padding: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #2563eb;
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 30px 0;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Ferdy</div>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} Ferdy. All rights reserved.</p>
    <p>Questions? Contact us at <a href="mailto:andrew@ferdy.io">andrew@ferdy.io</a></p>
  </div>
</body>
</html>
  `
}

export async function sendWelcomeEmail(to: string, name: string) {
  const content = `
    <h1>Welcome to Ferdy! 🎉</h1>
    <p>Hi ${name},</p>
    <p>Thank you for signing up for Ferdy! We're excited to help you automate your social media content creation.</p>
    <p>Your account is now set up and ready to go. Here's what you can do next:</p>
    <ul>
      <li>Add your brand information</li>
      <li>Connect your social media accounts</li>
      <li>Start creating automated content</li>
    </ul>
    <a href="https://www.ferdy.io/brands" class="button">Get Started</a>
    <p>If you have any questions, don't hesitate to reach out!</p>
    <p>Best regards,<br>The Ferdy Team</p>
  `

  return sendEmail({
    to,
    subject: 'Welcome to Ferdy!',
    html: getEmailTemplate(content),
  })
}

export async function sendSubscriptionConfirmationEmail(
  to: string,
  groupName: string,
  brandCount: number,
  monthlyTotal: number
) {
  const content = `
    <h1>Subscription Confirmed ✓</h1>
    <p>Hi there,</p>
    <p>Your Ferdy subscription for <strong>${groupName}</strong> is now active!</p>
    <h3>Subscription Details:</h3>
    <ul>
      <li><strong>Active Brands:</strong> ${brandCount}</li>
      <li><strong>Price per Brand:</strong> $86.00 USD/month</li>
      <li><strong>Monthly Total:</strong> $${monthlyTotal.toFixed(2)} USD</li>
    </ul>
    <p>Your first invoice will be sent shortly. You can manage your subscription and billing details anytime from your account.</p>
    <a href="https://www.ferdy.io/account/billing" class="button">View Billing</a>
    <p>Thank you for choosing Ferdy!</p>
    <p>Best regards,<br>The Ferdy Team</p>
  `

  return sendEmail({
    to,
    subject: 'Your Ferdy Subscription is Active',
    html: getEmailTemplate(content),
  })
}

export async function sendInvoicePaidEmail(
  to: string,
  groupName: string,
  amount: number,
  invoiceUrl: string
) {
  const content = `
    <h1>Payment Received</h1>
    <p>Hi there,</p>
    <p>We've received your payment for <strong>${groupName}</strong>.</p>
    <h3>Payment Details:</h3>
    <ul>
      <li><strong>Amount:</strong> $${(amount / 100).toFixed(2)} USD</li>
      <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
    </ul>
    <a href="${invoiceUrl}" class="button">View Invoice</a>
    <p>Thank you for your continued business!</p>
    <p>Best regards,<br>The Ferdy Team</p>
  `

  return sendEmail({
    to,
    subject: 'Payment Received - Ferdy',
    html: getEmailTemplate(content),
  })
}

export async function sendPaymentFailedEmail(
  to: string,
  groupName: string,
  amount: number
) {
  const content = `
    <h1>Payment Failed</h1>
    <p>Hi there,</p>
    <p>We were unable to process your payment for <strong>${groupName}</strong>.</p>
    <h3>Payment Details:</h3>
    <ul>
      <li><strong>Amount:</strong> $${(amount / 100).toFixed(2)} USD</li>
      <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
    </ul>
    <p>Please update your payment method to avoid any interruption to your service.</p>
    <a href="https://www.ferdy.io/account/billing" class="button">Update Payment Method</a>
    <p>If you have any questions, please contact us.</p>
    <p>Best regards,<br>The Ferdy Team</p>
  `

  return sendEmail({
    to,
    subject: 'Action Required: Payment Failed - Ferdy',
    html: getEmailTemplate(content),
  })
}

export async function sendBrandAddedEmail(
  to: string,
  groupName: string,
  brandName: string,
  newBrandCount: number,
  newMonthlyTotal: number
) {
  const content = `
    <h1>Brand Added</h1>
    <p>Hi there,</p>
    <p>A new brand has been added to your account: <strong>${brandName}</strong></p>
    <h3>Updated Subscription:</h3>
    <ul>
      <li><strong>Active Brands:</strong> ${newBrandCount}</li>
      <li><strong>New Monthly Total:</strong> $${newMonthlyTotal.toFixed(2)} USD</li>
    </ul>
    <p>Your subscription has been automatically updated. The prorated amount will be reflected on your next invoice.</p>
    <a href="https://www.ferdy.io/account/billing" class="button">View Billing</a>
    <p>Best regards,<br>The Ferdy Team</p>
  `

  return sendEmail({
    to,
    subject: `Brand Added: ${brandName} - Ferdy`,
    html: getEmailTemplate(content),
  })
}
