import { render } from '@react-email/render'
import { Resend } from 'resend'
import { NewUserInvite } from '@/emails/NewUserInvite'
import { ExistingUserInvite } from '@/emails/ExistingUserInvite'
import { InvoicePaid } from '@/emails/InvoicePaid'
import { BrandAdded } from '@/emails/BrandAdded'
import { BrandDeleted } from '@/emails/BrandDeleted'
import { ForgotPassword } from '@/emails/ForgotPassword'
import { MonthlyDraftsReady } from '@/emails/MonthlyDraftsReady'
import { WeeklyApprovalSummary } from '@/emails/WeeklyApprovalSummary'
import { LowApprovedDraftsReminder } from '@/emails/LowApprovedDraftsReminder'
import { PostPublished } from '@/emails/PostPublished'
import { SocialConnectionDisconnected } from '@/emails/SocialConnectionDisconnected'
import { TokenExpiringWarning } from '@/emails/TokenExpiringWarning'
import { PaymentFailed } from '@/emails/PaymentFailed'
import { SubscriptionCancelled } from '@/emails/SubscriptionCancelled'

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

export interface WeeklyApprovalSummaryData {
  to: string
  brandName: string
  approvedCount: number
  needsApprovalCount: number
  approvalLink: string
}

export interface LowApprovedDraftsReminderData {
  to: string
  brandName: string
  approvedDaysCount: number
  approvalLink: string
}

export interface PostPublishedData {
  to: string
  brandName: string
  publishedAt: string
  platform?: string // Deprecated: use channels array instead
  channels?: Array<{ name: string; channel: string; url: string | null }> // New: array of channels
  postLink: string
  postPreview?: string
}

export interface SocialConnectionDisconnectedData {
  to: string
  brandName: string
  platform: string
  reconnectLink: string
}

export interface TokenExpiringWarningData {
  to: string
  brandName: string
  platform: string
  daysUntilExpiry: number
  reconnectLink: string
}

export interface PaymentFailedData {
  to: string
  amount: number
  currency: string
  invoiceUrl: string
}

export interface SubscriptionCancelledData {
  to: string
  groupName: string
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

/**
 * @deprecated Monthly drafts ready email is no longer used.
 * Replaced by WeeklyApprovalSummary and LowApprovedDraftsReminder.
 */
export async function sendWeeklyApprovalSummary(data: WeeklyApprovalSummaryData) {
  const resend = getResend()
  
  const html = await render(
    WeeklyApprovalSummary({
      brandName: data.brandName,
      approvedCount: data.approvedCount,
      needsApprovalCount: data.needsApprovalCount,
      approvalLink: data.approvalLink,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `Weekly Approval Summary for ${data.brandName}`,
    html,
  })
}

export async function sendLowApprovedDraftsReminder(data: LowApprovedDraftsReminderData) {
  const resend = getResend()
  
  const html = await render(
    LowApprovedDraftsReminder({
      brandName: data.brandName,
      approvedDaysCount: data.approvedDaysCount,
      approvalLink: data.approvalLink,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `Low Approved Drafts Reminder for ${data.brandName}`,
    html,
  })
}

export async function sendPostPublished(data: PostPublishedData) {
  const resend = getResend()
  
  // Determine subject line based on channels or platform
  const subject = data.channels && data.channels.length > 0
    ? data.channels.length === 1
      ? `Post Published to ${data.channels[0].name}`
      : `Post Published to ${data.channels.length} Channels`
    : data.platform
      ? `Post Published to ${data.platform}`
      : 'Post Published'
  
  const html = await render(
    PostPublished({
      brandName: data.brandName,
      publishedAt: data.publishedAt,
      platform: data.platform, // For backward compatibility
      channels: data.channels, // New: array of channels
      postLink: data.postLink,
      postPreview: data.postPreview,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject,
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

export async function sendTokenExpiringWarning(data: TokenExpiringWarningData) {
  const resend = getResend()

  const urgencyText = data.daysUntilExpiry <= 1
    ? 'expires tomorrow'
    : `expires in ${data.daysUntilExpiry} days`

  const html = await render(
    TokenExpiringWarning({
      brandName: data.brandName,
      platform: data.platform,
      daysUntilExpiry: data.daysUntilExpiry,
      reconnectLink: data.reconnectLink,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `${data.platform} connection for ${data.brandName} ${urgencyText}`,
    html,
  })
}

export async function sendPaymentFailed(data: PaymentFailedData) {
  const resend = getResend()

  const html = await render(
    PaymentFailed({
      amount: data.amount,
      currency: data.currency,
      invoiceUrl: data.invoiceUrl,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Payment Failed - Action Required',
    html,
  })
}

export async function sendSubscriptionCancelled(data: SubscriptionCancelledData) {
  const resend = getResend()

  const html = await render(
    SubscriptionCancelled({
      groupName: data.groupName,
    })
  )

  return resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Your Ferdy Subscription Has Been Cancelled',
    html,
  })
}

/**
 * Send social connection disconnected email to all brand admins and editors
 * This is a wrapper that handles loading brand data and sending to multiple recipients
 */
export async function notifySocialConnectionDisconnected(params: {
  brandId: string
  provider: string
  accountHandle: string
  error: string
}) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('[notifySocialConnectionDisconnected] Sending disconnection notification', {
    brandId: params.brandId,
    provider: params.provider,
    accountHandle: params.accountHandle,
  })
  
  // Load brand name
  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('name')
    .eq('id', params.brandId)
    .single()
  
  if (!brand) {
    console.error('[notifySocialConnectionDisconnected] Brand not found:', params.brandId)
    return
  }
  
  // Get all admins and editors for the brand
  const { data: memberships } = await supabaseAdmin
    .from('brand_memberships')
    .select('user_id, role')
    .eq('brand_id', params.brandId)
    .in('role', ['admin', 'editor'])
    .eq('status', 'active')
  
  if (!memberships || memberships.length === 0) {
    console.warn('[notifySocialConnectionDisconnected] No admins/editors found for brand:', params.brandId)
    return
  }
  
  // Get user emails
  const userIds = memberships.map(m => m.user_id)
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  
  if (authError || !authUsers) {
    console.error('[notifySocialConnectionDisconnected] Failed to load users:', authError)
    return
  }
  
  const adminEmails: string[] = []
  for (const membership of memberships) {
    const authUser = authUsers.users.find(u => u.id === membership.user_id)
    if (authUser?.email) {
      adminEmails.push(authUser.email)
    }
  }
  
  // Deduplicate email addresses
  const uniqueEmails = [...new Set(adminEmails)]
  
  console.log('[notifySocialConnectionDisconnected] Sending to', uniqueEmails.length, 'recipients')
  
  // Format platform name
  const platformNames: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
  }
  const platformName = platformNames[params.provider] || params.provider
  
  // Generate reconnect link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ferdy.io'
  const reconnectLink = `${appUrl}/brands/${params.brandId}/integrations`
  
  // Send email to each recipient
  for (const email of uniqueEmails) {
    try {
      await sendSocialConnectionDisconnected({
        to: email,
        brandName: brand.name,
        platform: platformName,
        reconnectLink,
      })
      console.log('[notifySocialConnectionDisconnected] Sent email to:', email)
    } catch (error) {
      console.error('[notifySocialConnectionDisconnected] Failed to send email to', email, ':', error)
    }
  }
}
