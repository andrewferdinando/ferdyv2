import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendTokenExpiringWarning } from '@/lib/emails/send'
import { decryptToken } from '@/lib/encryption'
import { refreshSocialAccountToken } from '@/server/social/tokenRefresh'

/**
 * Token Expiry Check & Refresh
 *
 * This cron job runs daily and:
 * 1. Checks all social accounts for tokens expiring within 7 days
 * 2. Attempts to auto-refresh tokens that are expiring soon
 * 3. Sends warning emails if refresh fails or token is about to expire
 *
 * This endpoint should be called by a daily cron job (e.g., 9 AM)
 */
export async function POST() {
  try {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.ferdy.io'

    console.log('[token-expiry-check] Starting token expiry check at', now.toISOString())

    // Get all social accounts with tokens expiring within 7 days
    const { data: expiringAccounts, error: fetchError } = await supabaseAdmin
      .from('social_accounts')
      .select(`
        id,
        brand_id,
        provider,
        account_id,
        handle,
        token_encrypted,
        token_expires_at,
        last_refreshed_at,
        status,
        brands!inner (
          id,
          name,
          status
        )
      `)
      .eq('status', 'connected')
      .not('token_expires_at', 'is', null)
      .lte('token_expires_at', sevenDaysFromNow.toISOString())
      .eq('brands.status', 'active')

    if (fetchError) {
      console.error('[token-expiry-check] Error fetching expiring accounts:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    if (!expiringAccounts || expiringAccounts.length === 0) {
      console.log('[token-expiry-check] No expiring tokens found')
      return NextResponse.json({ message: 'No expiring tokens found', refreshed: 0, warned: 0 })
    }

    console.log(`[token-expiry-check] Found ${expiringAccounts.length} accounts with expiring tokens`)

    let refreshedCount = 0
    let warningsSent = 0
    let failedRefreshes = 0

    for (const account of expiringAccounts) {
      try {
        const expiryDate = new Date(account.token_expires_at!)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const brand = (account as any).brands

        console.log(`[token-expiry-check] Processing ${account.provider} account for brand ${brand.name}, expires in ${daysUntilExpiry} days`)

        // First, attempt to refresh the token
        const refreshResult = await refreshSocialAccountToken(account.id)

        if (refreshResult.success && refreshResult.refreshed) {
          console.log(`[token-expiry-check] Successfully refreshed token for ${account.provider} account ${account.id}`)
          refreshedCount++
          continue // Token refreshed, no need to send warning
        }

        if (!refreshResult.success) {
          console.warn(`[token-expiry-check] Failed to refresh token for ${account.provider} account ${account.id}:`, refreshResult.error)
          failedRefreshes++
        }

        // Token couldn't be refreshed or doesn't need refresh yet, send warning email
        // Only send warning if expiring within 7 days and we haven't sent one recently
        if (daysUntilExpiry <= 7) {
          // Get admin and editor emails for the brand
          const { data: memberships, error: membershipsError } = await supabaseAdmin
            .from('brand_memberships')
            .select('user_id, role')
            .eq('brand_id', account.brand_id)
            .in('role', ['admin', 'editor'])
            .eq('status', 'active')

          if (membershipsError || !memberships || memberships.length === 0) {
            console.warn(`[token-expiry-check] No active admins/editors found for brand ${account.brand_id}`)
            continue
          }

          // Get user emails from auth
          const adminEmails: string[] = []
          for (const membership of memberships) {
            try {
              const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(membership.user_id)
              if (userError || !user?.email) {
                continue
              }
              adminEmails.push(user.email)
            } catch (err) {
              console.error(`[token-expiry-check] Error fetching user ${membership.user_id}:`, err)
            }
          }

          if (adminEmails.length === 0) {
            continue
          }

          // Deduplicate email addresses
          const uniqueEmails = [...new Set(adminEmails)]
          const reconnectLink = `${appUrl}/brands/${account.brand_id}/engine-room/integrations`

          // Format platform name
          const platformNames: Record<string, string> = {
            facebook: 'Facebook',
            instagram: 'Instagram',
            linkedin: 'LinkedIn',
          }
          const platformName = platformNames[account.provider] || account.provider

          // Send email to each unique admin/editor
          for (const email of uniqueEmails) {
            try {
              await sendTokenExpiringWarning({
                to: email,
                brandName: brand.name,
                platform: platformName,
                daysUntilExpiry,
                reconnectLink,
              })
              warningsSent++
              console.log(`[token-expiry-check] Warning email sent to ${email} for ${platformName} (${daysUntilExpiry} days until expiry)`)
            } catch (err) {
              console.error(`[token-expiry-check] Failed to send email to ${email}:`, err)
            }
          }
        }
      } catch (err) {
        console.error(`[token-expiry-check] Error processing account ${account.id}:`, err)
      }
    }

    console.log(`[token-expiry-check] Completed: ${refreshedCount} refreshed, ${warningsSent} warnings sent, ${failedRefreshes} failed refreshes`)

    return NextResponse.json({
      message: 'Token expiry check completed',
      accountsChecked: expiringAccounts.length,
      refreshed: refreshedCount,
      warningsSent,
      failedRefreshes,
    })
  } catch (error) {
    console.error('[token-expiry-check] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Also support GET for Vercel cron
export async function GET() {
  return POST()
}
