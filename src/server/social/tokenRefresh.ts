/**
 * Token Refresh Utilities for Social Platform Integrations
 * 
 * Handles automatic token refresh for Meta (Facebook/Instagram) and LinkedIn
 * to prevent users from having to reconnect frequently.
 */

import { createClient } from '@supabase/supabase-js'
import { decryptToken, encryptToken } from '@/lib/encryption'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!

interface SocialAccount {
  id: string
  provider: string
  token_encrypted: string
  refresh_token_encrypted?: string
  token_expires_at?: string
  account_id: string
}

/**
 * Check if a token should be refreshed (expires within 7 days)
 */
export function shouldRefreshToken(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  
  const expiryDate = new Date(expiresAt)
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  return expiryDate <= sevenDaysFromNow
}

/**
 * Refresh Meta (Facebook/Instagram) token by exchanging for a new long-lived token
 */
export async function refreshMetaToken(socialAccount: SocialAccount): Promise<{
  success: boolean
  accessToken?: string
  expiresIn?: number
  error?: string
}> {
  try {
    console.log(`[refreshMetaToken] Refreshing token for ${socialAccount.provider} account ${socialAccount.id}`)

    // Decrypt the token before sending to Facebook
    let decryptedToken: string
    try {
      decryptedToken = decryptToken(socialAccount.token_encrypted)
    } catch (decryptError) {
      console.error(`[refreshMetaToken] Failed to decrypt token:`, decryptError)
      return {
        success: false,
        error: 'Failed to decrypt stored token'
      }
    }

    // Exchange current token for new long-lived token
    const url = `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `client_secret=${FACEBOOK_APP_SECRET}&` +
      `fb_exchange_token=${encodeURIComponent(decryptedToken)}`

    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok || data.error) {
      console.error(`[refreshMetaToken] Failed to refresh token:`, data.error)
      return {
        success: false,
        error: data.error?.message || 'Unknown error'
      }
    }

    console.log(`[refreshMetaToken] Successfully refreshed token, expires in ${data.expires_in} seconds`)

    return {
      success: true,
      accessToken: data.access_token,
      expiresIn: data.expires_in
    }
  } catch (error) {
    console.error(`[refreshMetaToken] Exception:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Refresh LinkedIn token using the refresh token
 */
export async function refreshLinkedInToken(socialAccount: SocialAccount): Promise<{
  success: boolean
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  error?: string
}> {
  try {
    console.log(`[refreshLinkedInToken] Refreshing token for LinkedIn account ${socialAccount.id}`)

    if (!socialAccount.refresh_token_encrypted) {
      return {
        success: false,
        error: 'No refresh token available'
      }
    }

    // Decrypt the refresh token before sending to LinkedIn
    let decryptedRefreshToken: string
    try {
      decryptedRefreshToken = decryptToken(socialAccount.refresh_token_encrypted)
    } catch (decryptError) {
      console.error(`[refreshLinkedInToken] Failed to decrypt refresh token:`, decryptError)
      return {
        success: false,
        error: 'Failed to decrypt stored refresh token'
      }
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decryptedRefreshToken,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET
    })
    
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })
    
    const data = await response.json()
    
    if (!response.ok || data.error) {
      console.error(`[refreshLinkedInToken] Failed to refresh token:`, data.error_description || data.error)
      return {
        success: false,
        error: data.error_description || data.error || 'Unknown error'
      }
    }
    
    console.log(`[refreshLinkedInToken] Successfully refreshed token, expires in ${data.expires_in} seconds`)
    
    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || socialAccount.refresh_token_encrypted, // LinkedIn may return same refresh token
      expiresIn: data.expires_in
    }
  } catch (error) {
    console.error(`[refreshLinkedInToken] Exception:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Refresh a social account's token if needed and update the database
 */
export async function refreshSocialAccountToken(socialAccountId: string): Promise<{
  success: boolean
  refreshed: boolean
  error?: string
}> {
  try {
    // Load the social account
    const { data: socialAccount, error: loadError } = await supabaseAdmin
      .from('social_accounts')
      .select('*')
      .eq('id', socialAccountId)
      .single()
    
    if (loadError || !socialAccount) {
      console.error(`[refreshSocialAccountToken] Failed to load social account:`, loadError)
      return {
        success: false,
        refreshed: false,
        error: 'Failed to load social account'
      }
    }
    
    // Check if token needs refresh
    if (!shouldRefreshToken(socialAccount.token_expires_at)) {
      console.log(`[refreshSocialAccountToken] Token for ${socialAccount.provider} account ${socialAccountId} does not need refresh yet`)
      return {
        success: true,
        refreshed: false
      }
    }
    
    console.log(`[refreshSocialAccountToken] Token for ${socialAccount.provider} account ${socialAccountId} expires soon, refreshing...`)
    
    // Refresh based on provider
    let refreshResult: {
      success: boolean
      accessToken?: string
      refreshToken?: string
      expiresIn?: number
      error?: string
    }
    
    if (socialAccount.provider === 'facebook' || socialAccount.provider === 'instagram') {
      refreshResult = await refreshMetaToken(socialAccount)
    } else if (socialAccount.provider === 'linkedin') {
      refreshResult = await refreshLinkedInToken(socialAccount)
    } else {
      return {
        success: false,
        refreshed: false,
        error: `Unsupported provider: ${socialAccount.provider}`
      }
    }
    
    if (!refreshResult.success) {
      // Mark account as disconnected
      await supabaseAdmin
        .from('social_accounts')
        .update({ status: 'disconnected' })
        .eq('id', socialAccountId)
      
      return {
        success: false,
        refreshed: false,
        error: refreshResult.error
      }
    }
    
    // Update the database with new token (encrypted)
    const expiresAt = refreshResult.expiresIn
      ? new Date(Date.now() + refreshResult.expiresIn * 1000).toISOString()
      : null

    // Encrypt the new tokens before storing
    const encryptedAccessToken = refreshResult.accessToken
      ? encryptToken(refreshResult.accessToken)
      : null

    if (!encryptedAccessToken) {
      console.error(`[refreshSocialAccountToken] No access token to encrypt`)
      return {
        success: false,
        refreshed: true,
        error: 'No access token returned from refresh'
      }
    }

    const updateData: any = {
      token_encrypted: encryptedAccessToken,
      token_expires_at: expiresAt,
      last_refreshed_at: new Date().toISOString(),
      status: 'connected' // Ensure status is set back to connected
    }

    // Update refresh token for LinkedIn if provided (also encrypted)
    if (refreshResult.refreshToken) {
      updateData.refresh_token_encrypted = encryptToken(refreshResult.refreshToken)
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('social_accounts')
      .update(updateData)
      .eq('id', socialAccountId)
    
    if (updateError) {
      console.error(`[refreshSocialAccountToken] Failed to update token:`, updateError)
      return {
        success: false,
        refreshed: true, // Token was refreshed but failed to save
        error: 'Failed to update token in database'
      }
    }
    
    console.log(`[refreshSocialAccountToken] Successfully refreshed and updated token for ${socialAccount.provider} account ${socialAccountId}`)
    
    return {
      success: true,
      refreshed: true
    }
  } catch (error) {
    console.error(`[refreshSocialAccountToken] Exception:`, error)
    return {
      success: false,
      refreshed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
