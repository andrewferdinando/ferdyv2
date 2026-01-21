import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decryptToken } from '@/lib/encryption'

export const runtime = 'nodejs'

interface TokenHealthResult {
  provider: string
  accountId: string
  handle: string
  status: 'healthy' | 'expiring_soon' | 'expired' | 'invalid' | 'error'
  expiresAt: string | null
  daysUntilExpiry: number | null
  lastRefreshed: string | null
  lastChecked: string
  error?: string
}

/**
 * Validate a Facebook/Instagram token by making a simple Graph API call
 */
async function validateMetaToken(token: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const url = new URL('https://graph.facebook.com/v19.0/me')
    url.searchParams.set('fields', 'id')
    url.searchParams.set('access_token', token)

    const response = await fetch(url, { method: 'GET' })
    const data = await response.json()

    if (!response.ok || data.error) {
      return {
        valid: false,
        error: data.error?.message || 'Token validation failed',
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate a LinkedIn token by making a simple API call
 */
async function validateLinkedInToken(token: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return {
        valid: false,
        error: data.message || 'Token validation failed',
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function extractToken(request: Request) {
  const header = request.headers.get('Authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

/**
 * POST /api/integrations/health-check
 * Check health of social account tokens for a brand
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, provider } = await request.json().catch(() => ({}))
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    // Build query
    let query = supabaseAdmin
      .from('social_accounts')
      .select('id, provider, account_id, handle, token_encrypted, token_expires_at, last_refreshed_at, status')
      .eq('brand_id', brandId)

    if (provider) {
      query = query.eq('provider', provider)
    }

    const { data: accounts, error: fetchError } = await query

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const results: TokenHealthResult[] = []
    const now = new Date()

    for (const account of accounts) {
      const result: TokenHealthResult = {
        provider: account.provider,
        accountId: account.account_id,
        handle: account.handle,
        status: 'healthy',
        expiresAt: account.token_expires_at,
        daysUntilExpiry: null,
        lastRefreshed: account.last_refreshed_at,
        lastChecked: now.toISOString(),
      }

      // Calculate days until expiry
      if (account.token_expires_at) {
        const expiryDate = new Date(account.token_expires_at)
        const diffMs = expiryDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        result.daysUntilExpiry = diffDays

        if (diffDays <= 0) {
          result.status = 'expired'
        } else if (diffDays <= 7) {
          result.status = 'expiring_soon'
        }
      }

      // Validate token if not already expired
      if (result.status !== 'expired' && account.token_encrypted) {
        try {
          const decryptedToken = decryptToken(account.token_encrypted)

          let validation: { valid: boolean; error?: string }
          if (account.provider === 'facebook' || account.provider === 'instagram') {
            validation = await validateMetaToken(decryptedToken)
          } else if (account.provider === 'linkedin') {
            validation = await validateLinkedInToken(decryptedToken)
          } else {
            validation = { valid: true } // Skip validation for unknown providers
          }

          if (!validation.valid) {
            result.status = 'invalid'
            result.error = validation.error
          }
        } catch (error) {
          result.status = 'error'
          result.error = error instanceof Error ? error.message : 'Failed to validate token'
        }
      }

      results.push(result)

      // Update the account status in the database if it changed
      const newStatus = result.status === 'healthy' || result.status === 'expiring_soon'
        ? 'connected'
        : result.status === 'expired' || result.status === 'invalid'
          ? 'expired'
          : account.status

      if (newStatus !== account.status) {
        await supabaseAdmin
          .from('social_accounts')
          .update({ status: newStatus })
          .eq('id', account.id)
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Health check failed' },
      { status: 500 },
    )
  }
}
