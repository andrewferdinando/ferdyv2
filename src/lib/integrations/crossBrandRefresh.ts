import { supabaseAdmin } from '@/lib/supabase-server'
import { encryptToken } from '@/lib/encryption'
import type { FacebookPageData } from './types'

/**
 * After a Facebook OAuth flow, refresh tokens for any OTHER brands that have
 * social_accounts matching the pages returned in this OAuth response.
 * This prevents re-authentication from invalidating existing connections.
 */
export async function refreshCrossBrandTokens(
  allPages: FacebookPageData[],
  currentBrandId: string,
): Promise<void> {
  // Build lookup maps: accountId → fresh access token
  const tokenByAccountId = new Map<string, string>()

  for (const page of allPages) {
    tokenByAccountId.set(page.id, page.access_token)
    // Instagram accounts use the parent page's token
    if (page.instagram_business_account?.id) {
      tokenByAccountId.set(page.instagram_business_account.id, page.access_token)
    }
  }

  const accountIds = Array.from(tokenByAccountId.keys())
  if (accountIds.length === 0) return

  // Find social_accounts on OTHER brands that match these account IDs
  const { data: otherAccounts, error } = await supabaseAdmin
    .from('social_accounts')
    .select('id, brand_id, account_id, provider')
    .in('provider', ['facebook', 'instagram'])
    .neq('brand_id', currentBrandId)
    .in('account_id', accountIds)

  if (error) {
    console.error('[crossBrandRefresh] Failed to query other brands:', error.message)
    return
  }

  if (!otherAccounts || otherAccounts.length === 0) return

  const nowIso = new Date().toISOString()

  for (const account of otherAccounts) {
    const freshToken = tokenByAccountId.get(account.account_id)
    if (!freshToken) continue

    const { error: updateError } = await supabaseAdmin
      .from('social_accounts')
      .update({
        token_encrypted: encryptToken(freshToken),
        last_refreshed_at: nowIso,
        status: 'connected',
      })
      .eq('id', account.id)

    if (updateError) {
      console.error('[crossBrandRefresh] Failed to update account:', {
        accountId: account.account_id,
        brandId: account.brand_id,
        error: updateError.message,
      })
    } else {
      console.log('[crossBrandRefresh] Refreshed token for:', {
        provider: account.provider,
        accountId: account.account_id,
        brandId: account.brand_id,
      })
    }
  }
}
