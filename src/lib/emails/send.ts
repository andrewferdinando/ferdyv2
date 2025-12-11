import { render } from '@react-email/render'
import { Resend } from 'resend'
import { NewUserInvite } from '@/emails/NewUserInvite'
import { ExistingUserInvite } from '@/emails/ExistingUserInvite'
import { InvoicePaid } from '@/emails/InvoicePaid'
import { BrandAdded } from '@/emails/BrandAdded'
import { BrandDeleted } from '@/emails/BrandDeleted'
import { ForgotPassword } from '@/emails/ForgotPassword'
import { MonthlyDraftsReady } from '@/emails/MonthlyDraftsReady'
import { PostPublished } from '@/emails/PostPublished'
import { SocialConnectionDisconnected } from '@/emails/SocialConnectionDisconnected'

// Initialize Resend
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

const FROM_EMAIL = 'Ferdy <support@ferdy.io>'

// Type definitions for each email
export interface NewUserInviteData {
  to: string
  inviteeName: string
  brandName: string
  inviterName: string
  inviteLink: string
}

export interface ExistingUserInviteData {
  to: string
  brandName: string
  inviterName: string
  magicLink: string
}

export interface InvoicePaidData {
  to: string
  amount: number
  currency: string
  planName: string
  brandCount: number
  billingPeriodStart: string
  billingPeriodEnd: string
  invoiceUrl: string
}

export interface BrandAddedData {
  to: string
  brandName: string
  newBrandCount: number
  newMonthlyTotal: number
  currency: string
}

export interface BrandDeletedData {
  to: string
  brandName: string
  remainingBrandCount: number
  newMonthlyTotal: number
  currency: string
  billingPeriodEnd: string
}

export interface ForgotPasswordData {
  to: string
  resetLink: string
}

export interface MonthlyDraftsReadyData {
  to: string
  brandName: string
  draftCount: number
  approvalLink: string
  month: string
}

export interface PostPublishedData {
  to: string
  brandName: string
  publishedAt: string
  platform: string
  postLink: string
  postPreview?: string
}

export interface SocialConnectionDisconnectedData {
  to: string
  brandName: string
  platform: string
  reconnectLink: string
}

// Email sending functions
export async function sendNewUserInvite(data: NewUserInviteData) {
  const resend = getResend()
  
  const html = await render(
    NewUserInvite({
      inviteeName: data.inviteeName,
      brandName: data.brandName,
      inviterName: data.inviterName,
      inviteLink: data.inviteLink,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `${data.inviterName} invited you to join ${data.brandName} on Ferdy`,
    html,
  })
}

export async function sendExistingUserInvite(data: ExistingUserInviteData) {
  const resend = getResend()
  
  const html = await render(
    ExistingUserInvite({
      brandName: data.brandName,
      inviterName: data.inviterName,
      magicLink: data.magicLink,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `You've been added to ${data.brandName} on Ferdy`,
    html,
  })
}

export async function sendInvoicePaid(data: InvoicePaidData) {
  const resend = getResend()
  
  const html = await render(
    InvoicePaid({
      amount: data.amount,
      currency: data.currency,
      planName: data.planName,
      brandCount: data.brandCount,
      billingPeriodStart: data.billingPeriodStart,
      billingPeriodEnd: data.billingPeriodEnd,
      invoiceUrl: data.invoiceUrl,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Payment Received - Thank You!',
    html,
  })
}

export async function sendBrandAdded(data: BrandAddedData) {
  const resend = getResend()
  
  const html = await render(
    BrandAdded({
      brandName: data.brandName,
      newBrandCount: data.newBrandCount,
      newMonthlyTotal: data.newMonthlyTotal,
      currency: data.currency,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `Brand Added: ${data.brandName}`,
    html,
  })
}

export async function sendBrandDeleted(data: BrandDeletedData) {
  const resend = getResend()
  
  const html = await render(
    BrandDeleted({
      brandName: data.brandName,
      remainingBrandCount: data.remainingBrandCount,
      newMonthlyTotal: data.newMonthlyTotal,
      currency: data.currency,
      billingPeriodEnd: data.billingPeriodEnd,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `Brand Removed: ${data.brandName}`,
    html,
  })
}

export async function sendForgotPassword(data: ForgotPasswordData) {
  const resend = getResend()
  
  const html = await render(
    ForgotPassword({
      resetLink: data.resetLink,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Reset Your Ferdy Password',
    html,
  })
}

export async function sendMonthlyDraftsReady(data: MonthlyDraftsReadyData) {
  const resend = getResend()
  
  console.log('[sendMonthlyDraftsReady] Input data:', {
    to: data.to,
    brandName: data.brandName,
    draftCount: data.draftCount,
    approvalLink: data.approvalLink,
    month: data.month,
  })
  
  const html = await render(
    MonthlyDraftsReady({
      brandName: data.brandName,
      draftCount: data.draftCount,
      approvalLink: data.approvalLink,
      month: data.month,
    })
  )
  
  // Log a snippet of the HTML to verify the link is correct
  const linkMatch = html.match(/href="([^"]*schedule\/drafts[^"]*)"/);
  console.log('[sendMonthlyDraftsReady] Link in rendered HTML:', linkMatch ? linkMatch[1] : 'NOT FOUND');

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `${data.draftCount} Drafts Ready for ${data.brandName}`,
    html,
  })
}

export async function sendPostPublished(data: PostPublishedData) {
  const resend = getResend()
  
  const html = await render(
    PostPublished({
      brandName: data.brandName,
      publishedAt: data.publishedAt,
      platform: data.platform,
      postLink: data.postLink,
      postPreview: data.postPreview,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `Post Published to ${data.platform}`,
    html,
  })
}

export async function sendSocialConnectionDisconnected(data: SocialConnectionDisconnectedData) {
  const resend = getResend()
  
  const html = await render(
    SocialConnectionDisconnected({
      brandName: data.brandName,
      platform: data.platform,
      reconnectLink: data.reconnectLink,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `Action Required: ${data.platform} Connection Lost`,
    html,
  })
}
