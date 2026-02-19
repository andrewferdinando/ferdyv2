import { supabaseAdmin } from '@/lib/supabase-server'
import { sendPublishingFailed } from '@/lib/emails/send'
import { getChannelLabel, CHANNEL_PROVIDER_MAP } from '@/lib/channels'

/**
 * Sends a publishing-failure email to all brand admins/editors.
 * Checks social_accounts to determine if the failure is due to a disconnected account.
 */
export async function notifyPublishingFailed(params: {
  brandId: string
  draftId: string
  failedChannels: string[]
  succeededChannels: string[]
}) {
  const { brandId, draftId, failedChannels, succeededChannels } = params

  console.log('[notifyPublishingFailed] Sending failure notification', {
    brandId,
    draftId,
    failedChannels,
    succeededChannels,
  })

  // Load brand name
  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('name')
    .eq('id', brandId)
    .single()

  if (!brand) {
    console.error('[notifyPublishingFailed] Brand not found:', brandId)
    return
  }

  // Check if any failed channel has a disconnected account
  const providers = new Set(
    failedChannels
      .map((ch) => CHANNEL_PROVIDER_MAP[ch])
      .filter((p): p is string => Boolean(p)),
  )

  let isAccountDisconnected = false
  if (providers.size > 0) {
    const { data: accounts } = await supabaseAdmin
      .from('social_accounts')
      .select('provider, status')
      .eq('brand_id', brandId)
      .in('provider', Array.from(providers))

    if (accounts) {
      for (const provider of providers) {
        const account = accounts.find((a) => a.provider === provider)
        if (!account || account.status !== 'connected') {
          isAccountDisconnected = true
          break
        }
      }
    } else {
      // No accounts at all — treat as disconnected
      isAccountDisconnected = true
    }
  }

  // Get all admins and editors for the brand
  const { data: memberships } = await supabaseAdmin
    .from('brand_memberships')
    .select('user_id, role')
    .eq('brand_id', brandId)
    .in('role', ['admin', 'editor'])
    .eq('status', 'active')

  if (!memberships || memberships.length === 0) {
    console.warn('[notifyPublishingFailed] No admins/editors found for brand:', brandId)
    return
  }

  // Get user emails
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

  if (authError || !authUsers) {
    console.error('[notifyPublishingFailed] Failed to load users:', authError)
    return
  }

  const adminEmails: string[] = []
  for (const membership of memberships) {
    const authUser = authUsers.users.find((u) => u.id === membership.user_id)
    if (authUser?.email) {
      adminEmails.push(authUser.email)
    }
  }

  const uniqueEmails = [...new Set(adminEmails)]

  if (uniqueEmails.length === 0) {
    console.warn('[notifyPublishingFailed] No email addresses found for brand admins/editors')
    return
  }

  console.log('[notifyPublishingFailed] Sending to', uniqueEmails.length, 'recipients')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ferdy.io'
  const viewLink = isAccountDisconnected
    ? `${appUrl}/brands/${brandId}/integrations`
    : `${appUrl}/brands/${brandId}/schedule?tab=attention`

  const failedChannelLabels = failedChannels.map(getChannelLabel)
  const succeededChannelLabels = succeededChannels.map(getChannelLabel)

  for (const email of uniqueEmails) {
    try {
      await sendPublishingFailed({
        to: email,
        brandName: brand.name,
        failedChannels: failedChannelLabels,
        succeededChannels: succeededChannelLabels,
        isAccountDisconnected,
        viewLink,
      })
      console.log('[notifyPublishingFailed] Sent email to:', email)
    } catch (error) {
      console.error('[notifyPublishingFailed] Failed to send email to', email, ':', error)
    }
  }
}
